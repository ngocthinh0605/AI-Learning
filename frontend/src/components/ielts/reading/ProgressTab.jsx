import React, { useEffect, useState } from "react";
import { TrendingUp, Clock, CheckCircle2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchAttempts } from "../../../api/readingApi";

export default function ProgressTab() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAttempts(page)
      .then((res) => { if (!cancelled) { setData(res); setError(null); } })
      .catch(() => { if (!cancelled) setError("Failed to load attempts."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const attempts = data?.attempts || [];
  const meta     = data?.meta || {};

  if (attempts.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-gray-400">No attempts yet</p>
        <p className="text-sm mt-1">Complete a practice session to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Band score trend chart */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Band Score Trend
        </h3>
        <BandChart attempts={attempts} />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle2 size={18} className="text-green-400" />}
          label="Total Attempts"
          value={meta.total ?? attempts.length}
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-accent-400" />}
          label="Best Band"
          value={Math.max(...attempts.map((a) => a.band_score || 0)).toFixed(1)}
        />
        <StatCard
          icon={<Clock size={18} className="text-yellow-400" />}
          label="Avg Score"
          value={`${Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length)}%`}
        />
      </div>

      {/* Attempt list */}
      <div className="space-y-3">
        {attempts.map((attempt) => (
          <AttemptRow
            key={attempt.id}
            attempt={attempt}
            onOpenReview={(attemptId) => navigate(`/ielts/reading/attempts/${attemptId}/review`)}
          />
        ))}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">Page {page} of {meta.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function AttemptRow({ attempt, onOpenReview }) {
  const band = attempt.band_score;
  const bandColor = band >= 7 ? "text-green-400" : band >= 6 ? "text-accent-400" : band >= 5 ? "text-yellow-400" : "text-red-400";
  const date = new Date(attempt.completed_at || attempt.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });

  return (
    <div className="flex items-center gap-4 bg-gray-800/40 border border-gray-700 rounded-xl px-4 py-3">
      <div className={`text-2xl font-bold w-12 text-center ${bandColor}`}>
        {band ? band.toFixed(1) : "—"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {attempt.ielts_reading_passage?.title || "Reading Passage"}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {attempt.score}/{attempt.total_questions} correct · {attempt.percentage}% · {date}
        </p>
      </div>
      <div className="text-xs text-gray-500 capitalize shrink-0">
        {attempt.ielts_reading_passage?.difficulty?.replace("_", " ")}
      </div>
      <button
        type="button"
        onClick={() => onOpenReview?.(attempt.id)}
        className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors shrink-0"
      >
        Open
      </button>
    </div>
  );
}

/**
 * Simple inline SVG line chart of band scores over time.
 * Reason: avoids adding a chart library dependency for a single chart.
 */
function BandChart({ attempts }) {
  const WIDTH  = 600;
  const HEIGHT = 120;
  const PAD    = 20;

  // Show most recent 10, oldest first for left-to-right trend
  const recent = [...attempts].slice(0, 10).reverse();
  if (recent.length < 2) {
    return <p className="text-sm text-gray-500 text-center py-4">Complete more attempts to see your trend.</p>;
  }

  const scores = recent.map((a) => Number(a.band_score) || 0);
  const minS   = Math.max(0, Math.min(...scores) - 0.5);
  const maxS   = Math.min(9, Math.max(...scores) + 0.5);
  const range  = maxS - minS || 1;

  const toX = (i) => PAD + (i / (recent.length - 1)) * (WIDTH - PAD * 2);
  const toY = (s) => HEIGHT - PAD - ((s - minS) / range) * (HEIGHT - PAD * 2);

  const points = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
      {/* Grid lines */}
      {[minS, (minS + maxS) / 2, maxS].map((v, i) => (
        <g key={i}>
          <line x1={PAD} y1={toY(v)} x2={WIDTH - PAD} y2={toY(v)}
            stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PAD - 4} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {scores.map((s, i) => (
        <circle key={i} cx={toX(i)} cy={toY(s)} r="4" fill="#6366f1" />
      ))}
    </svg>
  );
}
