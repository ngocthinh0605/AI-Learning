import React from "react";

/**
 * Three staggered dots for “assistant is typing” (waiting for stream or mid-reply).
 */
export default function TypingIndicator({ compact = false }) {
  const size = compact ? "h-1.5 w-1.5" : "h-2 w-2";
  const gap = compact ? "gap-1" : "gap-1.5";

  return (
    <div
      className={`inline-flex items-center ${gap} py-0.5`}
      role="status"
      aria-label="Assistant is typing"
    >
      <span
        className={`${size} rounded-full bg-accent-400/90 animate-typing-dot motion-reduce:animate-none`}
      />
      <span
        className={`${size} rounded-full bg-accent-400/80 animate-typing-dot [animation-delay:150ms] motion-reduce:animate-none`}
      />
      <span
        className={`${size} rounded-full bg-accent-400/65 animate-typing-dot [animation-delay:300ms] motion-reduce:animate-none`}
      />
    </div>
  );
}
