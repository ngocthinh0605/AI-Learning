import React, { useEffect, useRef } from "react";

/**
 * Renders the AI response bubble while it's still being streamed token by token.
 * Shows a blinking cursor at the end to indicate active generation.
 * Replaced by a normal MessageBubble once stream_end is received.
 */
export default function StreamingBubble({ text }) {
  const endRef = useRef(null);

  // Auto-scroll to bottom as tokens arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text]);

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-xs font-bold text-white">AI</span>
      </div>

      <div className="max-w-[78%]">
        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-800 text-gray-100 text-sm leading-relaxed">
          {text ? (
            <>
              {text}
              {/* Blinking cursor — signals live generation to the user */}
              <span className="inline-block w-0.5 h-4 bg-accent-400 ml-0.5 align-middle animate-pulse" />
            </>
          ) : (
            /* Typing dots shown before the first token arrives */
            <span className="flex items-center gap-1.5 py-0.5">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>
      </div>

      <div ref={endRef} />
    </div>
  );
}
