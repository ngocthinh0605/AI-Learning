import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, BookOpen, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { useReviewSession } from "../hooks/useReviewSession";
import ReviewCard from "../components/vocabulary/ReviewCard";
import ReviewProgress from "../components/vocabulary/ReviewProgress";

const MASTERY_LABELS = ["", "New", "Learning", "Familiar", "Known", "Mastered"];
const MASTERY_COLORS = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-blue-400", "text-green-400"];

export default function ReviewSessionPage() {
  const navigate = useNavigate();
  const {
    STATES, state, current, sessionResults, dueTotal,
    progress, errorMsg, flip, rate, restart,
  } = useReviewSession({ limit: 20 });

  const flipped    = state === STATES.ANSWER || state === STATES.SUBMITTING;
  const submitting = state === STATES.SUBMITTING;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === STATES.LOADING) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (state === STATES.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-4 text-center p-8">
        <XCircle size={40} className="text-red-400" />
        <p className="text-white font-semibold">Failed to load review session</p>
        <p className="text-gray-500 text-sm">{errorMsg}</p>
        <button onClick={restart} className="btn-primary">Try again</button>
        <button onClick={() => navigate("/vocabulary")} className="btn-ghost text-sm">Back to Vocabulary</button>
      </div>
    );
  }

  // ── No words due ─────────────────────────────────────────────────────────
  if (state === STATES.EMPTY) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-4 text-center p-8">
        <CheckCircle size={48} className="text-green-400" />
        <h2 className="text-xl font-bold text-white">All caught up!</h2>
        <p className="text-gray-400 text-sm max-w-xs">
          No words are due for review right now. Come back later or keep practicing conversations to add more words.
        </p>
        <button onClick={() => navigate("/vocabulary")} className="btn-primary">Back to Vocabulary</button>
      </div>
    );
  }

  // ── Session complete ─────────────────────────────────────────────────────
  if (state === STATES.COMPLETE) {
    const correct  = sessionResults.filter((r) => r.quality >= 3).length;
    const improved = sessionResults.filter((r) => r.newMastery > r.oldMastery).length;
    const xpEarned = correct * 2;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 max-w-lg mx-auto">
        {/* Trophy */}
        <div className="w-20 h-20 rounded-full bg-accent-500/20 flex items-center justify-center mb-6">
          <TrendingUp size={36} className="text-accent-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
        <p className="text-gray-400 text-sm mb-8">
          {correct} / {sessionResults.length} correct · +{xpEarned} XP earned
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <SummaryCard value={sessionResults.length} label="Reviewed" color="text-white" />
          <SummaryCard value={correct}               label="Correct"  color="text-green-400" />
          <SummaryCard value={improved}              label="Improved" color="text-accent-400" />
        </div>

        {/* Per-word breakdown */}
        <div className="w-full space-y-2 mb-8 max-h-64 overflow-y-auto">
          {sessionResults.map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-4 py-2.5">
              <span className={`text-xs font-bold w-4 text-center ${r.quality >= 3 ? "text-green-400" : "text-red-400"}`}>
                {r.quality}
              </span>
              <span className="flex-1 text-white text-sm font-medium truncate">{r.word}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className={MASTERY_COLORS[r.oldMastery]}>{MASTERY_LABELS[r.oldMastery]}</span>
                {r.newMastery !== r.oldMastery && (
                  <>
                    <span className="text-gray-600">→</span>
                    <span className={MASTERY_COLORS[r.newMastery]}>{MASTERY_LABELS[r.newMastery]}</span>
                  </>
                )}
              </span>
              <span className="text-xs text-gray-600">
                {r.nextReview
                  ? `next: ${new Date(r.nextReview).toLocaleDateString()}`
                  : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 w-full">
          {dueTotal > sessionResults.length && (
            <button onClick={restart} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <RotateCcw size={15} /> Review more ({dueTotal - sessionResults.length} left)
            </button>
          )}
          <button
            onClick={() => navigate("/vocabulary")}
            className={`btn-ghost flex-1 flex items-center justify-center gap-2 ${dueTotal <= sessionResults.length ? "btn-primary" : ""}`}
          >
            <BookOpen size={15} /> Back to Vocabulary
          </button>
        </div>
      </div>
    );
  }

  // ── Active session ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/vocabulary")}
          className="btn-ghost p-2 -ml-2"
          title="Exit session"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <ReviewProgress progress={progress} dueTotal={dueTotal} />
        </div>
      </div>

      {/* Card */}
      {current && (
        <ReviewCard
          word={current}
          flipped={flipped}
          onFlip={flip}
          onRate={rate}
          submitting={submitting}
        />
      )}

      {/* Flip hint (only on question side) */}
      {!flipped && (
        <p className="text-center text-gray-600 text-xs mt-6">
          Think about the meaning, then tap the card or press Space to reveal
        </p>
      )}
    </div>
  );
}

function SummaryCard({ value, label, color }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
