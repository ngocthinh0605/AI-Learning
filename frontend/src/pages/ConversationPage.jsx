import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookMarked, Wifi, WifiOff, MessageSquare, Mic } from "lucide-react";
import { fetchConversation, fetchMessages } from "../api/conversationsApi";
import { saveVocabularyWord } from "../api/vocabularyApi";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { useRealtimeSpeaking } from "../hooks/useRealtimeSpeaking";
import { useAudioStore } from "../hooks/useAudioStore";
import MessageBubble from "../components/chat/MessageBubble";
import StreamingBubble from "../components/chat/StreamingBubble";
import ChatInput from "../components/chat/ChatInput";
import RealtimeSpeakingButton from "../components/chat/RealtimeSpeakingButton";
import toast from "react-hot-toast";

export default function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [loadingConvo, setLoadingConvo] = useState(true);
  // "text" mode = keyboard input, "voice" mode = real-time continuous speaking
  const [inputMode, setInputMode] = useState("text");
  const bottomRef = useRef(null);

  // In-memory store for voice recordings — maps message ID → object URL
  const audioStore = useAudioStore();

  // Revoke all blob URLs when leaving the page to free browser memory
  useEffect(() => () => audioStore.revokeAll(), []);

  // Called by useStreamingChat when a user voice message is confirmed by the server
  const onRecordingBlob = useCallback((messageId, blob) => {
    audioStore.save(messageId, blob);
  }, [audioStore]);

  // Load conversation metadata + full message history from REST API on mount.
  // Reason: useStreamingChat initialises its WebSocket subscription immediately,
  // before this async fetch finishes. We load metadata and messages separately
  // so that setInitialMessages() can safely seed the chat list once data arrives
  // without racing against the WebSocket effect that used to wipe history.
  useEffect(() => {
    setLoadingConvo(true);
    Promise.all([
      fetchConversation(id),
      fetchMessages(id),
    ])
      .then(([convo, msgs]) => {
        setConversation(convo);
        setInitialMessages(msgs);
      })
      .catch(() => toast.error("Failed to load conversation"))
      .finally(() => setLoadingConvo(false));
  }, [id]);

  // ─── Voice conversation auto-loop callbacks ───────────────────────────────
  // Use refs to break the circular dependency between useStreamingChat and useRealtimeSpeaking.
  const handleAISpeechEndRef     = useRef(null);
  const handleStreamEndRef       = useRef(null);
  const handleEmptyTranscriptRef = useRef(null);

  const onAllSpeechEnd = useCallback(() => {
    handleAISpeechEndRef.current?.();
  }, []);

  const onTranscriptEmpty = useCallback(() => {
    handleEmptyTranscriptRef.current?.();
  }, []);

  const {
    messages,
    streamingText,
    isStreaming,
    isSpeaking,
    isConnected,
    sendMessage,
    vocabSuggestion,
    correction,
    clearVocab,
    interruptAI,
    liveTranscript,
    subscription,
    setPendingAudioBlob,
    setInitialMessages,
  } = useStreamingChat(id, [], {
    autoSpeak: inputMode === "voice",
    onAllSpeechEnd:    inputMode === "voice" ? onAllSpeechEnd                         : undefined,
    onTranscriptEmpty: inputMode === "voice" ? onTranscriptEmpty                      : undefined,
    onStreamEnd:       inputMode === "voice" ? () => handleStreamEndRef.current?.()  : undefined,
    onRecordingBlob:   inputMode === "voice" ? onRecordingBlob                       : undefined,
  });

  const {
    state: speakState,
    STATES,
    audioLevel,
    micError,
    liveTranscript: micTranscript,
    toggleConversation,
    handleAISpeechEnd,
    handleStreamEnd,
    handleEmptyTranscript,
    isActive: voiceIsActive,
  } = useRealtimeSpeaking({
    subscription,
    isStreaming,
    onInterrupt: interruptAI,
    // Park the blob in useStreamingChat so it can be paired with the message ID
    onRecordingComplete: (blob) => setPendingAudioBlob(blob),
  });

  // Wire handlers into refs so callbacks above can reach them after hook creation
  useEffect(() => {
    handleAISpeechEndRef.current     = handleAISpeechEnd;
    handleStreamEndRef.current       = handleStreamEnd;
    handleEmptyTranscriptRef.current = handleEmptyTranscript;
  }, [handleAISpeechEnd, handleStreamEnd, handleEmptyTranscript]);

  // Auto-scroll whenever messages or streaming text changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, liveTranscript]);

  // Show grammar corrections as a toast notification
  useEffect(() => {
    if (correction) {
      toast(`✏️ ${correction}`, { duration: 6000, icon: null });
    }
  }, [correction]);

  // Stop voice conversation when switching away from voice mode
  useEffect(() => {
    // handled gracefully — stopConversation is called by toggleConversation
  }, [inputMode]);

  async function handleSendText(text) {
    if (!isConnected) {
      toast.error("Not connected — please wait a moment.");
      return;
    }
    sendMessage(text);
  }

  async function handleSaveVocab() {
    if (!vocabSuggestion) return;
    try {
      await saveVocabularyWord(vocabSuggestion);
      toast.success(`"${vocabSuggestion.word}" saved to vocabulary!`);
      clearVocab();
    } catch {
      toast.error("Failed to save word");
    }
  }

  if (loadingConvo && !conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-900">
        <button onClick={() => navigate("/dashboard")} className="btn-ghost p-2 -ml-2">
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-white truncate">{conversation?.title}</h1>
          <p className="text-xs text-gray-500">{conversation?.topic}</p>
        </div>

        {/* Input mode toggle */}
        <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${inputMode === "text" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-300"}`}
          >
            <MessageSquare size={12} /> Text
          </button>
          <button
            onClick={() => setInputMode("voice")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${inputMode === "voice" ? "bg-accent-600 text-white" : "text-gray-400 hover:text-gray-300"}`}
          >
            <Mic size={12} /> Voice
          </button>
        </div>

        {/* WebSocket status indicator */}
        <div className="text-xs">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400">
              <Wifi size={13} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500">
              <WifiOff size={13} /> Connecting…
            </span>
          )}
        </div>

        {isStreaming && inputMode === "text" && (
          <span className="text-xs text-accent-400 animate-pulse">Aria is typing…</span>
        )}
      </div>

      {/* ── Vocabulary suggestion banner ── */}
      {vocabSuggestion && (
        <div className="bg-accent-500/10 border-b border-accent-500/20 px-5 py-3 flex items-center gap-3 animate-fade-in">
          <BookMarked size={16} className="text-accent-400 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-white">{vocabSuggestion.word}</span>
            <span className="text-gray-400 ml-2">{vocabSuggestion.definition}</span>
          </div>
          <button onClick={handleSaveVocab} className="text-xs text-accent-400 hover:text-accent-300 font-medium">
            Save word
          </button>
          <button onClick={clearVocab} className="text-gray-600 hover:text-gray-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">
              {inputMode === "voice"
                ? "Tap Start Voice Conversation below and speak naturally!"
                : "Say hello to start the conversation!"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            audioUrl={audioStore.get(msg.id)}
          />
        ))}

        {/* Live Whisper transcript preview (shown during PROCESSING) */}
        {liveTranscript && !isStreaming && (
          <div className="flex justify-end">
            <div className="max-w-[78%] px-4 py-2 rounded-2xl rounded-br-sm bg-accent-500/30 text-accent-100 text-sm italic border border-accent-500/40">
              "{liveTranscript}"
              <span className="ml-1 text-xs text-accent-300">transcribing…</span>
            </div>
          </div>
        )}

        {/* Live streaming bubble */}
        {isStreaming && <StreamingBubble text={streamingText} />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      {inputMode === "text" ? (
        <ChatInput
          onSendText={handleSendText}
          onSendAudio={() => {}}
          disabled={isStreaming || !isConnected}
        />
      ) : (
        <div className="border-t border-gray-800 bg-gray-900 px-4 py-4">
          <RealtimeSpeakingButton
            state={speakState}
            STATES={STATES}
            audioLevel={audioLevel}
            isSpeaking={isSpeaking}
            micError={micError}
            liveTranscript={micTranscript || liveTranscript}
            onToggle={toggleConversation}
            disabled={!isConnected}
          />
        </div>
      )}
    </div>
  );
}
