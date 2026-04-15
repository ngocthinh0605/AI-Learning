import React, { useRef, useState } from "react";
import { Volume2, AlertCircle, BookMarked, Mic, Square } from "lucide-react";
import { useTTS } from "../../hooks/useTTS";

/**
 * Renders a single chat message with optional TTS playback,
 * grammar correction banner, and pronunciation score.
 *
 * Props:
 *   message    - message object (role, content, pronunciation_score, etc.)
 *   onSaveWord - optional callback for saving vocab
 *   audioUrl   - optional object URL for user voice recording playback
 */
export default function MessageBubble({ message, onSaveWord, audioUrl }) {
  const { speak } = useTTS();
  const isUser = message.role === "user";

  // Playback state for the user's own recorded voice
  const audioRef    = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function handleSpeak() {
    speak(message.content);
  }

  function handlePlayRecording() {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended  = () => setIsPlaying(false);
      audioRef.current.onerror  = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }

  const pronunciationColor =
    message.pronunciation_score >= 0.85
      ? "text-green-400"
      : message.pronunciation_score >= 0.6
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs font-bold text-white">AI</span>
        </div>
      )}

      <div className={`max-w-[78%] space-y-1.5 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Main bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-accent-500 text-white rounded-br-sm"
              : "bg-gray-800 text-gray-100 rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Pronunciation score (user messages only) */}
        {isUser && message.pronunciation_score != null && (
          <span className={`text-xs ${pronunciationColor} flex items-center gap-1`}>
            Clarity: {Math.round(message.pronunciation_score * 100)}%
          </span>
        )}

        {/* Grammar correction (assistant messages) */}
        {!isUser && message.transcript_error && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-yellow-300">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{message.transcript_error}</span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 px-1">
          {/* AI message: TTS read-aloud + vocab save */}
          {!isUser && (
            <button
              onClick={handleSpeak}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Read aloud"
            >
              <Volume2 size={14} />
            </button>
          )}
          {!isUser && onSaveWord && (
            <button
              onClick={() => onSaveWord(message)}
              className="text-gray-500 hover:text-accent-400 transition-colors"
              title="Save vocabulary"
            >
              <BookMarked size={14} />
            </button>
          )}

          {/* User message: play back the voice recording if one exists */}
          {isUser && audioUrl && (
            <button
              onClick={handlePlayRecording}
              title={isPlaying ? "Stop playback" : "Play your recording"}
              className={`transition-colors ${
                isPlaying
                  ? "text-accent-400 hover:text-accent-300"
                  : "text-gray-500 hover:text-accent-400"
              }`}
            >
              {isPlaying ? <Square size={13} fill="currentColor" /> : <Mic size={14} />}
            </button>
          )}

          <span className="text-gray-600 text-xs">
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}
