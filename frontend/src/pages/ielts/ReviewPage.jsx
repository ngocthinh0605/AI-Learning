import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useReviewSession } from "../../hooks/useReviewSession";
import PassageViewer from "../../components/ielts/reading/PassageViewer";
import ReviewModePanel from "../../components/ielts/reading/ReviewModePanel";

/**
 * Review Mode page — route: /ielts/reading/attempts/:id/review
 *
 * Shows:
 *   - The original passage (with optional answer-location highlighting)
 *   - Wrong answers with AI error_type + explanation (AIExplanationBox)
 *   - AI-generated similar questions for further practice
 */
export default function ReviewPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [highlightPhrase, setHighlightPhrase] = useState(null);
  const [showPassage,     setShowPassage]     = useState(true);

  const {
    reviewData, loading, error,
    practiceAnswers, practiceSubmitted,
    setPracticeAnswer, submitPractice, resetPractice,
  } = useReviewSession(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading review…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle size={16} />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const passage         = reviewData?.attempt?.ielts_reading_passage;
  const wrongAnswers    = reviewData?.wrong_answers    || [];
  const similarQuestions = reviewData?.similar_questions || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/ielts/reading")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Back to Reading"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Review Mode</h1>
          <p className="text-sm text-gray-400">
            {wrongAnswers.length} mistake{wrongAnswers.length !== 1 ? "s" : ""} to review
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Passage */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Passage</h2>
            <button
              onClick={() => setShowPassage((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              {showPassage ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPassage ? "Hide" : "Show"} Passage
            </button>
          </div>

          {showPassage && passage && (
            <div className="bg-gray-800/60 rounded-2xl border border-white/10 p-5 max-h-[70vh] overflow-y-auto">
              <PassageViewer passage={passage} highlightPhrase={highlightPhrase} />
            </div>
          )}

          {/* Highlight controls — shown when wrong answers have location_in_passage */}
          {wrongAnswers.some((wa) => wa.location_in_passage) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Highlight answer location:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setHighlightPhrase(null)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors
                    ${!highlightPhrase
                      ? "border-accent-500 bg-accent-500/10 text-accent-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                >
                  None
                </button>
                {wrongAnswers
                  .filter((wa) => wa.location_in_passage)
                  .map((wa) => (
                    <button
                      key={wa.id}
                      onClick={() => setHighlightPhrase(wa.location_in_passage)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors
                        ${highlightPhrase === wa.location_in_passage
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      Q{wa.question_id}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Review panel */}
        <div className="bg-gray-800/40 rounded-2xl border border-white/10 p-5 max-h-[80vh] overflow-y-auto">
          <ReviewModePanel
            wrongAnswers={wrongAnswers}
            similarQuestions={similarQuestions}
            passage={passage}
            practiceAnswers={practiceAnswers}
            practiceSubmitted={practiceSubmitted}
            onPracticeAnswer={setPracticeAnswer}
            onSubmitPractice={submitPractice}
          />
        </div>
      </div>
    </div>
  );
}
