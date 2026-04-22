import React from "react";
import { MessageCircle, Send } from "lucide-react";
import TypingIndicator from "../components/chat/TypingIndicator";
import { useAIChat } from "../hooks/useAIChat";

export default function AIChatPage() {
  const {
    model,
    setModel,
    messages,
    input,
    setInput,
    streamingText,
    isStreaming,
    error,
    send,
    modelOptions,
  } = useAIChat();

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-4xl w-full mx-auto px-6 py-8">
      <header className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageCircle className="text-accent-400" size={28} />
          AI Chat
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Ask about English, IELTS, or grammar. Choose a model below.
        </p>
      </header>

      <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-gray-800 bg-gray-950/80 overflow-hidden shadow-xl shadow-black/20">
        <div className="shrink-0 px-4 py-3 border-b border-gray-800 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <span className="whitespace-nowrap">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isStreaming}
              className="rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm px-3 py-2 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-accent-500/50"
            >
              {modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 text-sm">
          {messages.length === 0 && !streamingText && (
            <p className="text-gray-500 text-center py-12">
              Start a conversation — your messages appear here.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent-600/90 text-white px-4 py-2.5 whitespace-pre-wrap"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-gray-800 text-gray-100 px-4 py-2.5 whitespace-pre-wrap border border-gray-700/80"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {isStreaming && !streamingText && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-800/90 px-4 py-3 border border-accent-500/25">
                <TypingIndicator />
              </div>
            </div>
          )}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-800/90 text-gray-100 px-4 py-2.5 whitespace-pre-wrap border border-accent-500/30">
                <span className="align-middle">{streamingText}</span>
                {isStreaming && (
                  <span className="inline-flex align-middle ml-1.5 translate-y-0.5">
                    <TypingIndicator compact />
                  </span>
                )}
              </div>
            </div>
          )}
          {error && (
            <p className="text-amber-400 text-center py-2">{error}</p>
          )}
        </div>

        <div className="shrink-0 p-4 border-t border-gray-800 flex gap-3 bg-gray-900/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your question…"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl bg-gray-900 border border-gray-700 text-gray-200 text-sm px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 self-end px-5 py-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
