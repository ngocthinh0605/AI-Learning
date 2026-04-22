import React, { useEffect, useMemo } from "react";
import { Zap, RefreshCw, Trophy, AlertCircle } from "lucide-react";
import { useWeaknessProfile } from "../../../hooks/useWeaknessProfile";
import { useTrainingSession } from "../../../hooks/useTrainingSession";
import WeaknessRadar from "./WeaknessRadar";
import TrainingExerciseCard from "./TrainingExerciseCard";

/**
 * Training Mode tab — shown as the 4th tab in ReadingPage.
 * Displays the user's weakness radar chart and AI-generated micro-exercises
 * targeting their weakest question type.
 */
export default function TrainingTab() {
  const { profile, loading: profileLoading } = useWeaknessProfile();
  const {
    exercises, weaknessType, currentIndex, currentExercise,
    submitted, loading, error, score, load, answerCurrent, next, reset,
    improvement, improvementLoading, improvementError,
  } = useTrainingSession();

  const previousAttemptData = useMemo(() => (
    profile?.weakness_by_type?.[profile?.weakest_type]
      ? {
        question_type: profile.weakest_type,
        accuracy: Number(profile.weakness_by_type[profile.weakest_type].rate || 0),
        attempts: Number(profile.weakness_by_type[profile.weakest_type].attempts || 0),
      }
      : { accuracy: 0 }
  ), [profile]);

  // Auto-load exercises once profile is available for baseline comparison.
  useEffect(() => {
    if (!profileLoading) {
      load({ count: 3, previousAttemptData });
    }
  }, [load, profileLoading, previousAttemptData]);

  return (
    <div className="space-y-8">
      {/* ── Weakness Profile ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Your Weakness Profile</h2>
          {profile?.recommended_difficulty && (
            <span className="text-xs bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full font-medium">
              Recommended: {profile.recommended_difficulty.replace("_", " ").toUpperCase()}
            </span>
          )}
        </div>

        {profileLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <WeaknessRadar weaknessByType={profile?.weakness_by_type || {}} />
        )}
      </section>

      {/* ── Training Exercises ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <h2 className="text-base font-semibold text-white">
              {weaknessType
                ? `Training: ${weaknessType.replace(/_/g, " ")}`
                : "Micro Exercises"}
            </h2>
          </div>
          <button
            onClick={() => { reset(); load({ count: 3, previousAttemptData }); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            New Set
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Generating exercises…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={15} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Active exercise */}
        {!loading && !error && !submitted && currentExercise && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Exercise {currentIndex + 1} of {exercises.length}
            </p>
            <TrainingExerciseCard
              exercise={currentExercise}
              onAnswer={answerCurrent}
              onNext={next}
              isLast={currentIndex === exercises.length - 1}
            />
          </div>
        )}

        {/* Results screen */}
        {!loading && submitted && (
          <div className="text-center space-y-4 py-8">
            <Trophy size={40} className="text-yellow-400 mx-auto" />
            <div>
              <p className="text-2xl font-bold text-white">{score} / {exercises.length}</p>
              <p className="text-sm text-gray-400 mt-1">
                {score === exercises.length
                  ? "Perfect! Great work."
                  : score >= exercises.length / 2
                  ? "Good effort! Keep practising."
                  : "Keep going — practice makes perfect."}
              </p>
            </div>
            <button
              onClick={() => { reset(); load({ count: 3, previousAttemptData }); }}
              className="mx-auto flex items-center gap-2 px-6 py-2.5 rounded-xl
                         bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} />
              Try Another Set
            </button>

            {(improvementLoading || improvement || improvementError) && (
              <div className="mx-auto max-w-xl text-left bg-gray-800 border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">Improvement Evaluation</h3>
                {improvementLoading && (
                  <p className="text-xs text-gray-400">Evaluating progress…</p>
                )}
                {improvementError && !improvementLoading && (
                  <p className="text-xs text-red-400">{improvementError}</p>
                )}
                {improvement && !improvementLoading && (
                  <>
                    <p className="text-xs text-gray-300">
                      Before: <span className="text-white font-medium">{Math.round((improvement.improvement?.before || 0) * 100)}%</span>
                      {" | "}
                      After: <span className="text-white font-medium">{Math.round((improvement.improvement?.after || 0) * 100)}%</span>
                      {" | "}
                      Delta: <span className={`font-medium ${(improvement.improvement?.delta || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {((improvement.improvement?.delta || 0) >= 0 ? "+" : "") + Math.round((improvement.improvement?.delta || 0) * 100)}%
                      </span>
                    </p>
                    <p className="text-xs text-gray-300">
                      Insight: <span className="text-white">{improvement.insight}</span>
                    </p>
                    <p className="text-xs text-gray-300">
                      Next Focus: <span className="text-accent-300">{improvement.next_focus}</span>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
