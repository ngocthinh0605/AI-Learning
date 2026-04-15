import React from "react";
import { Award } from "lucide-react";

/**
 * Displays the estimated IELTS band score with a visual indicator.
 * Band 0–4 = red, 4.5–5.5 = yellow, 6–7 = blue, 7.5+ = green
 */
export default function BandScoreCard({ bandScore, score, totalQuestions }) {
  const band = Number(bandScore) || 0;

  const { color, label, bg } = getBandStyle(band);

  const percentage = totalQuestions > 0
    ? Math.round((score / totalQuestions) * 100)
    : 0;

  return (
    <div className={`rounded-2xl border p-6 ${bg} text-center`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Award size={20} className={color} />
        <span className="text-sm font-medium text-gray-300">Estimated Band Score</span>
      </div>

      <div className={`text-6xl font-bold ${color} mb-1`}>
        {band.toFixed(1)}
      </div>

      <div className={`text-sm font-semibold ${color} mb-4`}>{label}</div>

      <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{score}</div>
          <div>Correct</div>
        </div>
        <div className="text-gray-600 text-xl">/</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalQuestions}</div>
          <div>Total</div>
        </div>
        <div className="text-gray-600 text-xl">·</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{percentage}%</div>
          <div>Score</div>
        </div>
      </div>
    </div>
  );
}

function getBandStyle(band) {
  if (band >= 7.5) return { color: "text-green-400",  bg: "bg-green-500/5 border-green-500/20",  label: "Expert" };
  if (band >= 7.0) return { color: "text-blue-400",   bg: "bg-blue-500/5 border-blue-500/20",    label: "Very Good" };
  if (band >= 6.0) return { color: "text-accent-400", bg: "bg-accent-500/5 border-accent-500/20", label: "Competent" };
  if (band >= 5.0) return { color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20", label: "Modest" };
  return               { color: "text-red-400",    bg: "bg-red-500/5 border-red-500/20",       label: "Limited" };
}
