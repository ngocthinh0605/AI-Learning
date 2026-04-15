import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeToConversation } from "../api/cableApi";
import { useTTS } from "./useTTS";

/**
 * Manages the full real-time streaming chat lifecycle for one conversation.
 *
 * Returns:
 *   messages       - array of saved messages (user + assistant)
 *   streamingText  - partial AI text currently being streamed (not yet saved)
 *   isStreaming    - true while AI is generating
 *   isConnected    - true once WebSocket is subscribed
 *   sendMessage(text) - sends text through the WebSocket channel
 *   vocabSuggestion   - vocabulary suggestion from last AI turn (or null)
 *   correction        - grammar correction from last AI turn (or null)
 *   clearVocab()   - dismisses the vocab suggestion
 */
export function useStreamingChat(conversationId, initialMessages = [], {
  autoSpeak = false,
  onAllSpeechEnd    = null, // called when TTS finishes all sentences
  onTranscriptEmpty = null, // called when Whisper returned no speech
  onStreamEnd       = null, // called on every stream_end (used as TTS fallback trigger)
  onRecordingBlob   = null, // called with (messageId, blob) once a voice turn is saved
} = {}) {
  const [messages, setMessages] = useState(initialMessages);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [vocabSuggestion, setVocabSuggestion] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const subscriptionRef = useRef(null);
  const streamBufferRef = useRef("");

  // Holds the raw audio blob from the latest voice recording until the backend
  // confirms the user_message_saved event and we have a real message ID to attach it to.
  const pendingAudioBlobRef = useRef(null);

  // Keep onRecordingBlob in a ref so the subscription callback is never stale.
  const onRecordingBlobRef = useRef(onRecordingBlob);
  useEffect(() => { onRecordingBlobRef.current = onRecordingBlob; }, [onRecordingBlob]);

  // Reason: autoSpeak is passed as a plain boolean but the WebSocket subscription
  // callback closes over it at creation time. Using a ref means the callback always
  // reads the current value even after inputMode changes without re-subscribing.
  const autoSpeakRef = useRef(autoSpeak);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  const onAllSpeechEndRef2 = useRef(onAllSpeechEnd);
  useEffect(() => { onAllSpeechEndRef2.current = onAllSpeechEnd; }, [onAllSpeechEnd]);

  const {
    speakStreamToken,
    flushSentenceBuffer,
    resetSentenceBuffer,
    pause: pauseTTS,
    stop:  stopTTS,
    isSpeaking,
  } = useTTS({
    // Always pass the callback — useTTS only calls it when autoSpeak is active
    onAllSpeechEnd: () => { if (autoSpeakRef.current) onAllSpeechEndRef2.current?.(); },
  });

  useEffect(() => {
    if (!conversationId) return;

    // Reason: do NOT reset messages here with initialMessages — the parent page
    // fetches the conversation asynchronously, so initialMessages is [] on the
    // first render. Messages are seeded via setInitialMessages() once the REST
    // call completes, preventing the "history cleared on load" bug.

    subscriptionRef.current = subscribeToConversation(conversationId, {
      onSubscribed: () => {
        console.info("[Chat] ✅ WebSocket subscribed to conversation", conversationId);
        setIsConnected(true);
      },
      onDisconnected: () => {
        console.warn("[Chat] ❌ WebSocket disconnected");
        setIsConnected(false);
      },

      onUserMessage: (data) => {
        // Replace optimistic message with server-confirmed one if needed
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === data.id);
          return exists ? prev : [...prev, data];
        });
        setLiveTranscript("");

        // Pair the recorded blob with the now-confirmed message ID
        if (pendingAudioBlobRef.current && data.id) {
          onRecordingBlobRef.current?.(data.id, pendingAudioBlobRef.current);
          pendingAudioBlobRef.current = null;
        }
      },

      onProcessingAudio: () => {
        console.info("[Chat] 🎙️ processing_audio received from server");
      },

      onTranscriptEmpty: () => {
        console.info("[Chat] 🔇 transcript_empty — no speech detected");
        // Notify the voice hook so it can auto-loop back to LISTENING
        onTranscriptEmpty?.();
      },

      onTranscript: (data) => {
        console.info("[Chat] 📝 transcript_ready:", data.text);
        setLiveTranscript(data.text || "");
      },

      onStreamStart: () => {
        console.info("[Chat] 🤖 stream_start received, autoSpeak=", autoSpeakRef.current);
        setIsStreaming(true);
        setStreamingText("");
        streamBufferRef.current = "";
        setCorrection(null);
        setVocabSuggestion(null);
        if (autoSpeakRef.current) resetSentenceBuffer();
      },

      onToken: (token) => {
        streamBufferRef.current += token;
        setStreamingText(streamBufferRef.current);
        if (autoSpeakRef.current) speakStreamToken(token);
      },

      onStreamEnd: (data) => {
        console.info("[Chat] ✅ stream_end received, autoSpeak=", autoSpeakRef.current);
        onStreamEnd?.();
        setIsStreaming(false);
        setStreamingText("");
        streamBufferRef.current = "";
        if (autoSpeakRef.current) flushSentenceBuffer();

        // Append the fully saved assistant message
        if (data.assistant_message) {
          setMessages((prev) => [...prev, data.assistant_message]);
        }
        if (data.correction) setCorrection(data.correction);
        if (data.vocabulary_suggestion) setVocabSuggestion(data.vocabulary_suggestion);
      },

      onError: (errorMsg) => {
        console.error("[Chat] ⚠️ stream_error:", errorMsg);
        setIsStreaming(false);
        setStreamingText("");
        streamBufferRef.current = "";
        if (autoSpeakRef.current) resetSentenceBuffer();
        // Surface the error as a fake assistant message so it appears in chat
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${errorMsg}`,
            created_at: new Date().toISOString(),
          },
        ]);
      },
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId]);

  const sendMessage = useCallback((text) => {
    if (!subscriptionRef.current || !text.trim()) return;

    // Optimistic update — show user message immediately before server confirms
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    subscriptionRef.current.sendMessage(text.trim());
  }, []);

  const clearVocab = useCallback(() => setVocabSuggestion(null), []);

  /**
   * Called by the page once the REST history fetch completes.
   * Only seeds the list when it is currently empty to avoid overwriting
   * messages that arrived via WebSocket before the HTTP response returned.
   */
  const setInitialMessages = useCallback((msgs) => {
    setMessages((prev) => (prev.length === 0 ? msgs : prev));
  }, []);

  /**
   * Called by ConversationPage when useRealtimeSpeaking fires onRecordingComplete.
   * We park the blob here and pair it with the message ID in onUserMessage.
   */
  const setPendingAudioBlob = useCallback((blob) => {
    pendingAudioBlobRef.current = blob;
  }, []);

  /**
   * Called twice by useRealtimeSpeaking during an interrupt:
   *   1st call (interruptPending=true)  → pause TTS so mic opens instantly
   *   2nd call (after recording starts) → hard stop to clear the queue
   * Reason: pause first gives near-zero latency for the mic to open, then
   * stop clears the queue once the user is already recording.
   */
  const interruptCallCountRef = useRef(0);
  const interruptAI = useCallback(() => {
    if (!autoSpeakRef.current) return;
    interruptCallCountRef.current += 1;
    if (interruptCallCountRef.current === 1) {
      pauseTTS();
    } else {
      stopTTS();
      interruptCallCountRef.current = 0;
    }
  }, [pauseTTS, stopTTS]);

  return {
    messages,
    streamingText,
    isStreaming,
    isSpeaking,        // true while TTS is actively playing audio
    isConnected,
    sendMessage,
    vocabSuggestion,
    correction,
    clearVocab,
    interruptAI,
    liveTranscript,
    subscription: subscriptionRef,
    setPendingAudioBlob,  // hand a recording blob before user_message_saved arrives
    setInitialMessages,   // seed history once the REST fetch completes
  };
}
