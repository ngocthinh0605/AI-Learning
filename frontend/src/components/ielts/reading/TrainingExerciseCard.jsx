import React, { useState } from "react";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";

const TYPE_LABELS = {
  paraphrase_match:  "Paraphrase Match",
  keyword_spotting:  "Keyword Spotting",
  scanning_practice: "Scanning Practice",
  main_idea:         "Main Idea",
};

/**
 * Renders a single training micro-exercise with interactive answer selection.
 *
 * Props:
 *   exercise     {Object}   - { question, options, correct_answer, explanation }
 *   onAnswer     {Function} - called with the selected answer string
 *   onNext       {Function} - called when user advances
 *   isLast       {boolean}  - true if this is the final exercise
 */
export default function TrainingExerciseCard({ exercise, onAnswer, onNext, isLast }) {
  const [selected,  setSelected]  = useState(null);
  const [revealed,  setRevealed]  = useState(false);

  if (!exercise) return null;

  const { type, question, options = [], correct_answer: correctAnswer, explanation } = exercise;
  const isCorrect = selected?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();

  const handleSelect = (opt) => {
    if (revealed) return;
    setSelected(opt);
    onAnswer?.(opt);
    setRevealed(true);
  };

  return (
    <div className="bg-gray-800 rounded-2xl border border-white/10 p-6 space-y-4">
      {/* Exercise type badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
          {TYPE_LABELS[type] || "Targeted Practice"}
        </span>
      </div>

      {/* Prompt */}
      <p className="text-gray-200 text-sm leading-relaxed">{question}</p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selected === opt;
          const correct    = correctAnswer?.trim().toLowerCase() === opt.trim().toLowerCase();
          let style = "border-white/10 text-gray-300 hover:border-accent-500/50";
          if (revealed && correct)    style = "border-green-500 bg-green-500/10 text-green-300";
          if (revealed && isSelected && !correct) style = "border-red-500 bg-red-500/10 text-red-300";

          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={revealed}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Feedback after reveal */}
      {revealed && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm
          ${isCorrect ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
          {isCorrect
            ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
            : <XCircle    size={15} className="shrink-0 mt-0.5" />}
          <span>{explanation || (isCorrect ? "Correct!" : `Correct answer: ${correctAnswer}`)}</span>
        </div>
      )}

      {/* Next button */}
      {revealed && (
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-colors"
        >
          {isLast ? "See Results" : "Next Exercise"}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
