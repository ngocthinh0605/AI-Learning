import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Continuous voice conversation state machine:
 *
 *   IDLE        → [startConversation]          → LISTENING
 *   LISTENING   → [silence detected / debounce]→ PROCESSING
 *   LISTENING   → [user taps end]              → IDLE
 *   PROCESSING  → [stream_start from backend]  → AI_SPEAKING
 *   AI_SPEAKING → [TTS fully done + debounce]  → LISTENING  ← auto-loop
 *   AI_SPEAKING → [user speaks / taps mic]     → LISTENING  ← interrupt
 *   any active  → [user taps end]              → IDLE
 *
 * Key design points per spec:
 * - Mic stream stays open for the entire conversation (one getUserMedia call).
 * - AnalyserNode stays active in ALL states for interrupt detection.
 * - Auto-loop is debounced (default 400ms) to avoid rapid re-triggering.
 * - Interrupt uses TTS.pause() (non-destructive) so the mic opens instantly.
 * - After interrupt, TTS.stop() clears the queue once recording actually starts.
 */
export function useRealtimeSpeaking({
  subscription,            // useRef wrapping ActionCable subscription
  isStreaming,             // boolean: true while backend is generating tokens
  onInterrupt,             // called when user interrupts AI (stops TTS in useStreamingChat)
  onRecordingComplete,     // called with (blob, mimeType) when a recording turn ends
  silenceMs        = 1200, // ms of silence before auto-stop
  audioSliceMs     = 250,  // MediaRecorder chunk interval
  autoLoopDebounce = 400,  // ms to wait after AI finishes before opening mic again
} = {}) {

  const STATES = {
    IDLE:        "IDLE",
    LISTENING:   "LISTENING",
    PROCESSING:  "PROCESSING",
    AI_SPEAKING: "AI_SPEAKING",
  };

  const [state, setState]                   = useState(STATES.IDLE);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError]             = useState(null);
  const [audioLevel, setAudioLevel]         = useState(0);

  // ─── Refs ────────────────────────────────────────────────────────────────
  const mediaRecorderRef     = useRef(null);
  const audioContextRef      = useRef(null);
  const analyserRef          = useRef(null);
  const silenceTimerRef      = useRef(null);
  const autoLoopTimerRef     = useRef(null);   // debounce timer for auto-loop
  const animFrameRef         = useRef(null);
  const streamRef            = useRef(null);
  const stateRef             = useRef(STATES.IDLE);
  const conversationActiveRef = useRef(false);

  // Audio chunk queue state
  const pendingReadsRef    = useRef(0);
  const hasSpokenRef       = useRef(false);
  const chunkQueueRef      = useRef([]);
  const processingQueueRef = useRef(false);
  const pendingEOSRef      = useRef(false);

  // Accumulate raw chunks for the playback blob (separate from the b64 send queue)
  const recordingChunksRef = useRef([]);
  const recordingMimeRef   = useRef("audio/webm");

  // Interrupt tracking — set when user speaks over AI so stop() fires on recording start
  const interruptPendingRef = useRef(false);

  const isStreamingRef = useRef(isStreaming);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  const setStateSync = useCallback((s) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // ─── Subscription helper ─────────────────────────────────────────────────
  function getSub() {
    if (!subscription) return null;
    const sub = subscription.current !== undefined ? subscription.current : subscription;
    if (!sub) console.error("[RTS] getSub: subscription.current is null");
    return sub;
  }

  // ─── Silence / interrupt thresholds (with hysteresis) ────────────────────
  const SPEAKING_THRESHOLD = 18; // energy > this → "user is speaking"
  const SILENCE_THRESHOLD  = 12; // energy < this → "user is silent"

  // ─── Audio monitor (always on while conversation is active) ──────────────
  function startAudioMonitor(analyser) {
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (avg / 128) * 100));

      const isSpeaking = avg >= SPEAKING_THRESHOLD;
      const isSilent   = avg < SILENCE_THRESHOLD;
      const s = stateRef.current;

      if (s === STATES.LISTENING) {
        if (isSpeaking) {
          hasSpokenRef.current = true;
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        } else if (isSilent && hasSpokenRef.current && !silenceTimerRef.current) {
          // Reason: only start silence countdown after the user has spoken at least once.
          // This prevents the timer firing the instant the mic opens in a quiet room.
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") stopRecording();
          }, silenceMs);
        }
      } else if (s === STATES.AI_SPEAKING) {
        // Reason: AnalyserNode stays active during AI_SPEAKING so the user can
        // interrupt naturally by speaking — exactly like ChatGPT voice mode.
        if (isSpeaking) {
          handleInterrupt();
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }

  function stopAudioMonitor() {
    cancelAnimationFrame(animFrameRef.current);
    clearTimeout(silenceTimerRef.current);
    clearTimeout(autoLoopTimerRef.current);
    silenceTimerRef.current = null;
    autoLoopTimerRef.current = null;
    setAudioLevel(0);
    analyserRef.current = null;
  }

  // ─── Interrupt ────────────────────────────────────────────────────────────
  function handleInterrupt() {
    // Reason: pause() rather than stop() so TTS yields immediately without throwing
    // "interrupted" errors on all queued utterances. The queue gets stop()'d once
    // recording actually starts (see startRecording).
    interruptPendingRef.current = true;
    onInterrupt?.(); // this calls useTTS.pause() via useStreamingChat.interruptAI
    clearTimeout(autoLoopTimerRef.current);
    console.debug("[RTS] Interrupt — pausing AI, opening mic");
    startRecording();
  }

  // ─── Audio chunk queue ────────────────────────────────────────────────────
  function processChunkQueue() {
    if (processingQueueRef.current || chunkQueueRef.current.length === 0) return;
    processingQueueRef.current = true;

    const blob   = chunkQueueRef.current.shift();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.split(",")[1];
      if (base64) {
        getSub()?.perform("receive_audio", { audio_chunk: base64 });
      }
      pendingReadsRef.current -= 1;
      processingQueueRef.current = false;

      if (chunkQueueRef.current.length > 0) {
        processChunkQueue();
      } else if (pendingReadsRef.current === 0 && pendingEOSRef.current) {
        pendingEOSRef.current = false;
        getSub()?.perform("receive_audio", { signal: "end_of_speech" });
        console.debug("[RTS] end_of_speech sent");
      }
    };
    reader.readAsDataURL(blob);
  }

  function sendAudioChunk(blob) {
    pendingReadsRef.current += 1;
    chunkQueueRef.current.push(blob);
    processChunkQueue();
  }

  function signalEndOfSpeech() {
    pendingEOSRef.current = true;
    if (pendingReadsRef.current === 0 && chunkQueueRef.current.length === 0) {
      pendingEOSRef.current = false;
      getSub()?.perform("receive_audio", { signal: "end_of_speech" });
      console.debug("[RTS] end_of_speech sent (immediate)");
    }
  }

  // ─── Recording ────────────────────────────────────────────────────────────
  function startRecording() {
    if (!streamRef.current) {
      console.error("[RTS] startRecording: no mic stream open");
      return;
    }
    // If this was triggered by an interrupt, fully stop the TTS queue now
    // (we only paused it earlier so the mic could open without latency)
    if (interruptPendingRef.current) {
      interruptPendingRef.current = false;
      onInterrupt?.(); // second call = hard stop via useStreamingChat
    }

    // Reset per-turn state
    pendingReadsRef.current    = 0;
    hasSpokenRef.current       = false;
    chunkQueueRef.current      = [];
    processingQueueRef.current = false;
    pendingEOSRef.current      = false;
    recordingChunksRef.current = [];

    const mimeType = getSupportedMimeType();
    recordingMimeRef.current = mimeType;

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        // Collect for local playback blob AND send to backend
        recordingChunksRef.current.push(e.data);
        sendAudioChunk(e.data);
      }
    };

    recorder.onstop = () => {
      // Build the playback blob and surface it to the parent before transitioning
      if (recordingChunksRef.current.length > 0) {
        const blob = new Blob(recordingChunksRef.current, { type: recordingMimeRef.current });
        onRecordingComplete?.(blob, recordingMimeRef.current);
        console.debug("[RTS] recording blob ready:", blob.size, "bytes");
      }
      setStateSync(STATES.PROCESSING);
      signalEndOfSpeech();
    };

    recorder.start(audioSliceMs);
    setStateSync(STATES.LISTENING);
    console.debug("[RTS] Recording started");
  }

  function stopRecording() {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  // ─── Conversation lifecycle ───────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (conversationActiveRef.current) return;
    setMicError(null);
    setLiveTranscript("");

    try {
      // Open mic stream once for the entire session
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        const ctx      = new AudioContext();
        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = ctx;
        // Start the always-on audio monitor (silence + interrupt detection)
        startAudioMonitor(analyser);
      }

      conversationActiveRef.current = true;
      startRecording();
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Microphone permission denied."
        : `Mic error: ${err.message}`;
      setMicError(msg);
      conversationActiveRef.current = false;
    }
  }, []);

  const stopConversation = useCallback(() => {
    conversationActiveRef.current = false;
    clearTimeout(autoLoopTimerRef.current);
    stopRecording();
    stopAudioMonitor();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    audioContextRef.current  = null;
    streamRef.current        = null;
    mediaRecorderRef.current = null;
    setStateSync(STATES.IDLE);
    console.debug("[RTS] Conversation stopped");
  }, []);

  const toggleConversation = useCallback(() => {
    const s = stateRef.current;
    if (s === STATES.IDLE) {
      startConversation();
    } else if (s === STATES.AI_SPEAKING) {
      // Tap during AI speech = manual interrupt → start listening
      handleInterrupt();
    } else {
      // LISTENING or PROCESSING → fully end session
      stopConversation();
    }
  }, [startConversation, stopConversation]);

  // ─── isStreaming transitions ──────────────────────────────────────────────
  useEffect(() => {
    if (isStreaming && stateRef.current === STATES.PROCESSING) {
      setStateSync(STATES.AI_SPEAKING);
      setLiveTranscript("");
    }
  }, [isStreaming]);

  // ─── Auto-loop callbacks (called by useStreamingChat) ────────────────────

  /**
   * Called when TTS finishes ALL sentences (via useTTS.onAllSpeechEnd).
   * Debounced so rapid end-event bursts don't open the mic prematurely.
   */
  const handleAISpeechEnd = useCallback(() => {
    if (!conversationActiveRef.current) return;
    clearTimeout(autoLoopTimerRef.current);
    autoLoopTimerRef.current = setTimeout(() => {
      if (!conversationActiveRef.current) return;
      console.debug("[RTS] Auto-loop: AI done → LISTENING");
      setStateSync(STATES.IDLE);
      // Additional small gap so the user hears the last word before mic opens
      setTimeout(() => {
        if (conversationActiveRef.current) startRecording();
      }, 150);
    }, autoLoopDebounce);
  }, [autoLoopDebounce]);

  /**
   * Called when stream_end arrives but there's no TTS (text mode fallback).
   * Also acts as a safety net in case TTS fires onEnd before handleAISpeechEnd.
   */
  const handleStreamEnd = useCallback(() => {
    // Only act if still in AI_SPEAKING and conversation is active
    if (stateRef.current !== STATES.AI_SPEAKING) return;
    if (!conversationActiveRef.current) return;
    // Let handleAISpeechEnd handle it if TTS is active; this is just a fallback
    clearTimeout(autoLoopTimerRef.current);
    autoLoopTimerRef.current = setTimeout(() => {
      if (stateRef.current === STATES.AI_SPEAKING && conversationActiveRef.current) {
        console.debug("[RTS] Stream-end fallback: no TTS end received → LISTENING");
        setStateSync(STATES.IDLE);
        setTimeout(() => {
          if (conversationActiveRef.current) startRecording();
        }, 150);
      }
    }, autoLoopDebounce + 500); // longer debounce — TTS should fire first
  }, [autoLoopDebounce]);

  /**
   * Called when Whisper returned an empty transcript (silence / noise).
   * Loops straight back to LISTENING so the user can speak again.
   */
  const handleEmptyTranscript = useCallback(() => {
    if (!conversationActiveRef.current) return;
    console.debug("[RTS] Empty transcript — re-opening mic");
    setStateSync(STATES.IDLE);
    setTimeout(() => {
      if (conversationActiveRef.current) startRecording();
    }, 300);
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      conversationActiveRef.current = false;
      clearTimeout(autoLoopTimerRef.current);
      stopAudioMonitor();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
    state,
    STATES,
    liveTranscript,
    setLiveTranscript,
    micError,
    audioLevel,
    startConversation,
    stopConversation,
    toggleConversation,
    handleAISpeechEnd,
    handleStreamEnd,
    handleEmptyTranscript,
    isIdle:       state === STATES.IDLE,
    isListening:  state === STATES.LISTENING,
    isProcessing: state === STATES.PROCESSING,
    isAISpeaking: state === STATES.AI_SPEAKING,
    isActive:     state !== STATES.IDLE,
  };
}

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}
