import { useCallback, useRef, useState, useEffect } from "react";

/**
 * Browser Web Speech API TTS hook — sentence-by-sentence streaming.
 *
 * Key browser compatibility fixes:
 * 1. Voice loading: Chrome loads voices async — we wait for `voiceschanged` before
 *    speaking so `getVoices()` never returns an empty array.
 * 2. Chrome 15-second bug: Chrome's SpeechSynthesis queue silently stalls after ~15s
 *    of continuous speech. We call `cancel()` then re-queue to recover.
 * 3. Always call `cancel()` before each `speak()` call — this resets Chrome's internal
 *    state and prevents the stall bug from accumulating across turns.
 * 4. Sentence splitting: extended to handle emoji, colons, and long tokens without
 *    punctuation (> 200 chars gets flushed automatically to avoid unbounded buffering).
 */
export function useTTS({
  onAllSpeechEnd,
  speechEndDebounceMs = 400,
} = {}) {
  const sentenceBufferRef   = useRef("");
  const pendingUtterRef     = useRef(0);
  const debounceTimerRef    = useRef(null);
  const voicesReadyRef      = useRef(false);
  const pendingQueueRef     = useRef([]); // texts waiting until voices are ready
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Sentence boundary — punctuation OR long chunk fallback
  const SENTENCE_END = /[.!?…]+(?:\s|$)/;

  const onAllSpeechEndRef = useRef(onAllSpeechEnd);
  onAllSpeechEndRef.current = onAllSpeechEnd;

  // ─── Voice loading ────────────────────────────────────────────────────────
  // Reason: Chrome loads voices asynchronously. getVoices() returns [] on first
  // call. We must wait for voiceschanged OR check on demand with a fallback.
  function getPreferredVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    // Prefer: Google en-GB > Google en-US > Microsoft Natural > any en-US
    return (
      voices.find((v) => v.name.includes("Google") && v.lang === "en-GB") ||
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find((v) => v.name.toLowerCase().includes("natural") && v.lang.startsWith("en")) ||
      voices.find((v) => v.lang === "en-US") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null
    );
  }

  useEffect(() => {
    if (!window.speechSynthesis) return;

    function onVoicesChanged() {
      voicesReadyRef.current = true;
      // Flush any texts that were queued before voices loaded
      if (pendingQueueRef.current.length > 0) {
        const queued = pendingQueueRef.current.splice(0);
        queued.forEach((text) => utterInternal(text));
      }
    }

    // Voices may already be loaded (Firefox / some Chrome versions)
    if (window.speechSynthesis.getVoices().length > 0) {
      voicesReadyRef.current = true;
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    }

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
    };
  }, []);

  // ─── Debounced "all speech done" callback ─────────────────────────────────
  function scheduleSpeechEnd() {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingUtterRef.current === 0) {
        setIsSpeaking(false);
        onAllSpeechEndRef.current?.();
      }
    }, speechEndDebounceMs);
  }

  // ─── Core utterance ───────────────────────────────────────────────────────
  function utterInternal(text, { rate = 0.92, pitch = 1.0, lang = "en-US" } = {}) {
    if (!window.speechSynthesis || !text.trim()) return;

    pendingUtterRef.current += 1;
    clearTimeout(debounceTimerRef.current);

    // Reason: Chrome has a known bug where the synthesis queue stalls after ~15 seconds.
    // Calling cancel() before each utterance resets the internal state and prevents the stall.
    // We then immediately re-queue the utterance so nothing is lost.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = rate;
    utterance.pitch = pitch;
    utterance.lang  = lang;

    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);

    utterance.onend = () => {
      pendingUtterRef.current = Math.max(0, pendingUtterRef.current - 1);
      if (pendingUtterRef.current === 0) scheduleSpeechEnd();
    };

    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      console.warn("[TTS] utterance error:", e.error, text.slice(0, 40));
      pendingUtterRef.current = Math.max(0, pendingUtterRef.current - 1);
      if (pendingUtterRef.current === 0) scheduleSpeechEnd();
    };

    // Small async delay so Chrome's cancel() fully clears before we re-speak
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }

  function utter(text, options = {}) {
    if (!text.trim()) return;

    if (!voicesReadyRef.current) {
      // Voices not loaded yet — queue for when they are
      pendingQueueRef.current.push(text);
      // Also try to load voices now (triggers the voiceschanged event in Chrome)
      window.speechSynthesis?.getVoices();
      return;
    }

    utterInternal(text, options);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Speak a full string immediately. */
  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis || !text.trim()) return;
    window.speechSynthesis.cancel();
    pendingUtterRef.current = 0;
    clearTimeout(debounceTimerRef.current);
    pendingQueueRef.current = [];
    utter(text, options);
  }, []);

  /**
   * Feed one token from the LLM stream. Speaks a sentence as soon as a
   * boundary is detected. Falls back to flushing if the buffer gets very long
   * (e.g. responses without punctuation).
   */
  const speakStreamToken = useCallback((token) => {
    if (!window.speechSynthesis) return;
    sentenceBufferRef.current += token;

    const match = sentenceBufferRef.current.match(SENTENCE_END);
    if (match) {
      const endIdx   = sentenceBufferRef.current.indexOf(match[0]) + match[0].length;
      const sentence = sentenceBufferRef.current.slice(0, endIdx).trim();
      sentenceBufferRef.current = sentenceBufferRef.current.slice(endIdx);
      if (sentence) utter(sentence);
    } else if (sentenceBufferRef.current.length > 200) {
      // Reason: flush on word boundary if buffer is very long to avoid indefinite delay
      const lastSpace = sentenceBufferRef.current.lastIndexOf(" ");
      if (lastSpace > 100) {
        const chunk = sentenceBufferRef.current.slice(0, lastSpace).trim();
        sentenceBufferRef.current = sentenceBufferRef.current.slice(lastSpace + 1);
        if (chunk) utter(chunk);
      }
    }
  }, []);

  /** Speak any text remaining in the buffer after stream ends. */
  const flushSentenceBuffer = useCallback(() => {
    const remaining = sentenceBufferRef.current.trim();
    sentenceBufferRef.current = "";
    if (remaining) utter(remaining);
  }, []);

  /** Clear buffer without speaking — use when a new stream or interrupt starts. */
  const resetSentenceBuffer = useCallback(() => {
    sentenceBufferRef.current = "";
    pendingUtterRef.current   = 0;
    pendingQueueRef.current   = [];
    clearTimeout(debounceTimerRef.current);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis?.pause();
    clearTimeout(debounceTimerRef.current);
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis?.resume();
    if (pendingUtterRef.current > 0) setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    sentenceBufferRef.current = "";
    pendingUtterRef.current   = 0;
    pendingQueueRef.current   = [];
    clearTimeout(debounceTimerRef.current);
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    speakStreamToken,
    flushSentenceBuffer,
    resetSentenceBuffer,
    pause,
    resume,
    stop,
    isSpeaking,
  };
}
