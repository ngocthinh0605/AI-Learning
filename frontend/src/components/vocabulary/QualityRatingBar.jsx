import React, { useEffect, useCallback } from "react";

/**
 * 6-button quality rating bar for SM-2 reviews.
 *
 * Quality scale:
 *   0 — Blackout     (complete blank)
 *   1 — Wrong        (incorrect, recognised after seeing)
 *   2 — Hard         (incorrect, easy to remember after seeing)
 *   3 — OK           (correct with difficulty)
 *   4 — Good         (correct with hesitation)
 *   5 — Perfect      (instant recall)
 *
 * Keyboard shortcuts: press 0-5 to rate without clicking.
 */

const RATINGS = [
  { quality: 0, label: "Blackout", shortLabel: "0",  color: "bg-red-900/60   hover:bg-red-800   border-red-700   text-red-300"    },
  { quality: 1, label: "Wrong",    shortLabel: "1",  color: "bg-red-800/60   hover:bg-red-700   border-red-600   text-red-200"    },
  { quality: 2, label: "Hard",     shortLabel: "2",  color: "bg-orange-800/60 hover:bg-orange-700 border-orange-600 text-orange-200" },
  { quality: 3, label: "OK",       shortLabel: "3",  color: "bg-yellow-800/60 hover:bg-yellow-700 border-yellow-600 text-yellow-200" },
  { quality: 4, label: "Good",     shortLabel: "4",  color: "bg-green-800/60 hover:bg-green-700  border-green-600  text-green-200"  },
  { quality: 5, label: "Perfect",  shortLabel: "5",  color: "bg-emerald-800/60 hover:bg-emerald-700 border-emerald-600 text-emerald-200" },
];

export default function QualityRatingBar({ onRate, disabled = false }) {
  // Keyboard shortcut: 0-5 maps directly to quality score
  const handleKey = useCallback((e) => {
    if (disabled) return;
    const n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 0 && n <= 5) onRate(n);
  }, [onRate, disabled]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 text-center">How well did you remember it?</p>
      <div className="grid grid-cols-6 gap-1.5">
        {RATINGS.map(({ quality, label, shortLabel, color }) => (
          <button
            key={quality}
            onClick={() => !disabled && onRate(quality)}
            disabled={disabled}
            title={`${label} (press ${shortLabel})`}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-medium
              transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
          >
            <span className="text-base font-bold leading-none">{shortLabel}</span>
            <span className="leading-none opacity-80">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 text-center">or press 0 – 5 on your keyboard</p>
    </div>
  );
}
