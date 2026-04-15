import React from "react";
import AIExplanationBox from "./AIExplanationBox";
import QuestionPanel from "./QuestionPanel";

/**
 * Displays wrong answers with AI explanations and similar practice questions.
 *
 * Props:
 *   wrongAnswers      {Array}    - IeltsUserAnswer objects with error_type + explanation
 *   similarQuestions  {Array}    - AI-generated similar questions
 *   passage           {Object}   - passage object (for context labels)
 *   practiceAnswers   {Object}   - { questionId: answer }
 *   practiceSubmitted {boolean}
 *   onPracticeAnswer  {Function} - (questionId, value) => void
 *   onSubmitPractice  {Function}
 */
export default function ReviewModePanel({
  wrongAnswers      = [],
  similarQuestions  = [],
  passage,
  practiceAnswers   = {},
  practiceSubmitted = false,
  onPracticeAnswer,
  onSubmitPractice,
}) {
  return (
    <div className="space-y-8">
      {/* ── Wrong Answers Section ── */}
      {wrongAnswers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Mistakes &amp; AI Analysis
          </h3>
          <div className="space-y-4">
            {wrongAnswers.map((wa) => (
              <div key={wa.id} className="bg-gray-800/60 rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    Q{wa.question_id} · {wa.question_type?.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-red-400 font-medium">Incorrect</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Your answer</p>
                    <p className="text-red-300">{wa.user_answer || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Correct answer</p>
                    <p className="text-green-300">{wa.correct_answer}</p>
                  </div>
                </div>

                {wa.error_type && (
                  <AIExplanationBox
                    errorType={wa.error_type}
                    explanation={wa.explanation}
                    suggestion={wa.suggestion}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Similar Practice Questions ── */}
      {similarQuestions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Practice Similar Questions
          </h3>

          {(() => {
            const fb = practiceSubmitted ? buildFeedback(similarQuestions, practiceAnswers) : null;
            return similarQuestions.map((q) => (
              <QuestionPanel
                key={q.id}
                question={q}
                answer={practiceAnswers[String(q.id)] ?? ""}
                onChange={onPracticeAnswer}
                feedback={fb?.questions?.find((f) => String(f.id) === String(q.id)) || null}
                submitted={practiceSubmitted}
              />
            ));
          })()}

          {!practiceSubmitted && (
            <button
              onClick={onSubmitPractice}
              className="mt-4 w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500
                         text-white text-sm font-medium transition-colors"
            >
              Check Answers
            </button>
          )}
        </section>
      )}

      {wrongAnswers.length === 0 && similarQuestions.length === 0 && (
        <p className="text-center text-gray-500 py-8 text-sm">
          No review data available for this attempt.
        </p>
      )}
    </div>
  );
}

// Build a minimal feedback object so QuestionPanel can show correct/incorrect styling.
function buildFeedback(questions, answers) {
  const questionsFb = questions.map((q) => {
    const correct   = (q.answer || "").trim().toUpperCase();
    const submitted = (answers[String(q.id)] || "").trim().toUpperCase();
    return {
      id:          q.id,
      is_correct:  submitted === correct,
      explanation: submitted === correct ? "Correct!" : `Correct answer: ${q.answer}`,
    };
  });
  return { questions: questionsFb };
}
