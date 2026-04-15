import React from "react";

/**
 * Thin progress bar + counter shown at the top of the review session.
 * progress = { done: number, total: number }
 */
export default function ReviewProgress({ progress, dueTotal }) {
  const { done, total } = progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="w-full space-y-1.5">
      {/* Counter row */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{done} / {total} reviewed</span>
        {dueTotal > total && (
          <span className="text-accent-400">{dueTotal - done} more due today</span>
        )}
        <span>{pct}%</span>
      </div>

      {/* Bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
