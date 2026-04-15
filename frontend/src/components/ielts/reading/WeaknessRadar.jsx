import React from "react";

const TYPE_LABELS = {
  mcq:                  "MCQ",
  true_false_not_given: "T/F/NG",
  fill_blank:           "Fill Blank",
  matching_headings:    "Headings",
  matching_information: "Matching Info",
  summary_completion:   "Summary",
};

const BAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-red-500",
  "bg-orange-500",
];

/**
 * Renders a horizontal bar chart of weakness rates by question type.
 * Lower rate = more red, higher rate = more green.
 *
 * Props:
 *   weaknessByType {Object} - shape: { "mcq": { rate, attempts, correct }, ... }
 */
export default function WeaknessRadar({ weaknessByType }) {
  if (!weaknessByType || Object.keys(weaknessByType).length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        Complete a practice session to see your weakness analysis.
      </div>
    );
  }

  const entries = Object.entries(weaknessByType)
    .map(([type, stats]) => ({ type, ...stats }))
    .sort((a, b) => a.rate - b.rate);

  return (
    <div className="space-y-3">
      {entries.map(({ type, rate, attempts, correct }, i) => {
        const pct   = Math.round((rate || 0) * 100);
        const color = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

        return (
          <div key={type}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{TYPE_LABELS[type] || type}</span>
              <span className={pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}>
                {pct}% ({correct}/{attempts})
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
