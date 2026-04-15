import React from "react";
import { Lightbulb, RotateCcw, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BandScoreCard from "./BandScoreCard";
import QuestionPanel from "./QuestionPanel";
import AIExplanationBox from "./AIExplanationBox";

/**
 * Shown after a reading session is submitted.
 * Displays band score, AI tips, per-question feedback with AIExplanationBox,
 * and a "Review Mistakes" button linking to the Review Mode page.
 *
 * Props:
 *   attempt  {Object}   - attempt object returned by the API
 *   passage  {Object}   - original passage (needed to re-render questions)
 *   onRetry  {Function} - callback to start a new session
 */
export default function FeedbackPanel({ attempt, passage, onRetry }) {
  const navigate = useNavigate();

  if (!attempt || !passage) return null;

  const feedback            = attempt.feedback || {};
  const questionFeedbackMap = Object.fromEntries(
    (feedback.questions || []).map((q) => [String(q.id), q])
  );

  const hasWrongAnswers = (feedback.questions || []).some((q) => !q.is_correct);

  return (
    <div className="space-y-6">
      {/* Band score summary */}
      <BandScoreCard
        bandScore={feedback.band_score}
        score={attempt.score}
        totalQuestions={attempt.total_questions}
      />

      {/* AI tips */}
      {feedback.tips && (
        <div className="flex gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <Lightbulb size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">{feedback.tips}</p>
        </div>
      )}

      {/* Review Mistakes button — only shown when there are wrong answers */}
      {hasWrongAnswers && attempt.id && (
        <button
          onClick={() => navigate(`/ielts/reading/attempts/${attempt.id}/review`)}
          className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30
                     border border-purple-500/30 text-purple-300 font-medium py-3 rounded-xl transition-colors"
        >
          <BookOpen size={16} />
          Review Mistakes &amp; Practice Similar Questions
        </button>
      )}

      {/* Quick path to attempt history for revisiting past passages */}
      <button
        onClick={() => navigate("/ielts/reading?tab=progress")}
        className="w-full flex items-center justify-center gap-2 bg-gray-800/70 hover:bg-gray-700/70
                   border border-gray-700 text-gray-200 font-medium py-3 rounded-xl transition-colors"
      >
        <BookOpen size={16} />
        View Reading History
      </button>

      {/* Per-question breakdown with AI error explanations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Question Breakdown
        </h3>
        <div className="space-y-4">
          {passage.questions.map((q) => {
            const fb = questionFeedbackMap[String(q.id)];
            return (
              <div key={q.id} className="space-y-2">
                <QuestionPanel
                  question={q}
                  answer={attempt.answers?.[String(q.id)] || ""}
                  onChange={() => {}}
                  feedback={fb}
                  submitted
                />
                {/* Show AIExplanationBox only for wrong answers that have error_type */}
                {fb && !fb.is_correct && fb.error_type && (
                  <div className="pl-2">
                    <AIExplanationBox
                      errorType={fb.error_type}
                      explanation={fb.explanation}
                      suggestion={fb.suggestion}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600
                   text-white font-medium py-3 rounded-xl transition-colors"
      >
        <RotateCcw size={16} />
        Try Another Passage
      </button>
    </div>
  );
}
