import React, { useState, useRef } from "react";
import { Send } from "lucide-react";
import VoiceButton from "./VoiceButton";

/**
 * Bottom input bar with both text input and voice recording controls.
 */
export default function ChatInput({ onSendText, onSendAudio, disabled }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  function handleTextSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendText(trimmed);
    setText("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleTextSubmit(e);
    }
  }

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <form onSubmit={handleTextSubmit} className="flex items-end gap-3">
        <VoiceButton onAudioReady={onSendAudio} disabled={disabled} />

        <div className="flex-1 flex items-end gap-2 bg-gray-800 rounded-2xl px-4 py-2.5 border border-gray-700 focus-within:border-accent-500 transition-colors">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a message or use the mic to speak…"
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none leading-6 max-h-32"
            style={{ overflowY: text.split("\n").length > 3 ? "auto" : "hidden" }}
          />
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="text-accent-400 hover:text-accent-300 disabled:text-gray-600 transition-colors flex-shrink-0 pb-0.5"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      <p className="text-center text-gray-600 text-xs mt-2">
        Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">Enter</kbd> to send · Click mic to speak
      </p>
    </div>
  );
}
