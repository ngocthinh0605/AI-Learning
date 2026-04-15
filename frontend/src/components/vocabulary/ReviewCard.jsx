import React, { useEffect } from "react";
import { Volume2, RotateCcw } from "lucide-react";
import { useTTS } from "../../hooks/useTTS";
import QualityRatingBar from "./QualityRatingBar";

const MASTERY_LABELS = ["", "New", "Learning", "Familiar", "Known", "Mastered"];
const MASTERY_COLORS = [
  "",
  "text-red-400",
  "text-orange-400",
  "text-yellow-400",
  "text-blue-400",
  "text-green-400",
];

const WORD_TYPE_COLORS = {
  noun:         "text-blue-300 bg-blue-400/15 border-blue-400/25",
  verb:         "text-green-300 bg-green-400/15 border-green-400/25",
  adjective:    "text-purple-300 bg-purple-400/15 border-purple-400/25",
  adverb:       "text-yellow-300 bg-yellow-400/15 border-yellow-400/25",
  pronoun:      "text-pink-300 bg-pink-400/15 border-pink-400/25",
  preposition:  "text-orange-300 bg-orange-400/15 border-orange-400/25",
  conjunction:  "text-teal-300 bg-teal-400/15 border-teal-400/25",
  interjection: "text-red-300 bg-red-400/15 border-red-400/25",
  phrase:       "text-indigo-300 bg-indigo-400/15 border-indigo-400/25",
};

/**
 * Flip card for a single vocabulary review.
 *
 * Front  → shows the word, type badge, and a "Tap to reveal" hint.
 * Back   → shows definition, context sentence, mastery, and QualityRatingBar.
 *
 * The card flips with a CSS 3D rotation. Space bar also flips the card.
 */
export default function ReviewCard({ word, flipped, onFlip, onRate, submitting }) {
  const { speak } = useTTS();

  // Space bar flips; Enter also flips when not yet flipped
  useEffect(() => {
    function handleKey(e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) onFlip();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flipped, onFlip]);

  function handleSpeak() {
    const text = word.context_sentence
      ? `${word.word}. ${word.context_sentence}`
      : word.word;
    speak(text);
  }

  return (
    // Perspective wrapper — required for 3D flip
    <div className="w-full" style={{ perspective: "1200px" }}>
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle:  "preserve-3d",
          transform:       flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight:       "320px",
        }}
      >
        {/* ── FRONT ── */}
        <div
          className="absolute inset-0 rounded-2xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center p-8 cursor-pointer select-none"
          style={{ backfaceVisibility: "hidden" }}
          onClick={onFlip}
        >
          {word.word_type && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize mb-4
              ${WORD_TYPE_COLORS[word.word_type] ?? "text-gray-300 bg-gray-700 border-gray-600"}`}>
              {word.word_type}
            </span>
          )}

          <h2 className="text-4xl font-bold text-white text-center mb-3">{word.word}</h2>

          <p className="text-gray-500 text-sm mt-6 flex items-center gap-1.5">
            <RotateCcw size={13} />
            Tap to reveal · or press Space
          </p>
        </div>

        {/* ── BACK ── */}
        <div
          className="absolute inset-0 rounded-2xl bg-gray-800 border border-gray-700 flex flex-col p-6 overflow-y-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Word header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-2xl font-bold text-white">{word.word}</h2>
                {word.word_type && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize
                    ${WORD_TYPE_COLORS[word.word_type] ?? "text-gray-300 bg-gray-700 border-gray-600"}`}>
                    {word.word_type}
                  </span>
                )}
                <span className={`text-xs font-medium ${MASTERY_COLORS[word.mastery_level]}`}>
                  {MASTERY_LABELS[word.mastery_level]}
                </span>
              </div>
            </div>

            <button
              onClick={handleSpeak}
              className="text-gray-500 hover:text-accent-400 transition-colors flex-shrink-0"
              title="Listen"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Definition */}
          {word.definition && (
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">{word.definition}</p>
          )}

          {/* Context sentence */}
          {word.context_sentence && (
            <p className="text-gray-500 text-xs italic mb-3 leading-relaxed">
              "{word.context_sentence}"
            </p>
          )}

          {/* Review stats */}
          <p className="text-gray-600 text-xs mb-5">
            Reviewed {word.review_count ?? 0} time{word.review_count !== 1 ? "s" : ""}
            {word.consecutive_correct > 0 && ` · ${word.consecutive_correct} in a row`}
          </p>

          {/* Rating bar */}
          <div className="mt-auto">
            <QualityRatingBar onRate={onRate} disabled={submitting} />
          </div>
        </div>
      </div>
    </div>
  );
}
