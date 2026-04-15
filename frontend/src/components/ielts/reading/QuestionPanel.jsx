import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * Renders a single IELTS reading question based on its type.
 * Supported types:
 *   mcq | true_false_not_given | fill_blank | matching_headings |
 *   matching_information | summary_completion
 *
 * Props:
 *   question   {Object}  - question object from the passage
 *   answer     {string|Object} - current user answer for this question
 *   onChange   {Function}- (questionId, value) => void
 *   feedback   {Object}  - { is_correct, explanation } — shown after submission
 *   submitted  {boolean} - if true, shows correct/incorrect styling
 */
export default function QuestionPanel({ question, answer, onChange, feedback, submitted }) {
  const { id, type } = question;

  const handleChange = (value) => {
    if (!submitted) onChange(id, value);
  };

  const statusIcon = submitted && feedback ? (
    feedback.is_correct
      ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
      : <XCircle     size={16} className="text-red-400 shrink-0" />
  ) : null;

  const borderClass = submitted && feedback
    ? feedback.is_correct ? "border-green-500/40" : "border-red-500/40"
    : "border-gray-700";

  return (
    <div className={`rounded-xl border p-4 transition-colors ${borderClass}`}>
      {/* Question number + status icon */}
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xs font-bold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full shrink-0">
          Q{id}
        </span>
        {statusIcon}
        <QuestionText question={question} />
      </div>

      {/* Answer input — varies by type */}
      {type === "mcq" && (
        <MCQOptions
          options={question.options}
          selected={answer}
          onSelect={handleChange}
          submitted={submitted}
          correctAnswer={question.answer}
        />
      )}

      {type === "true_false_not_given" && (
        <TFNGOptions
          selected={answer}
          onSelect={handleChange}
          submitted={submitted}
          correctAnswer={question.answer}
        />
      )}

      {type === "fill_blank" && (
        <FillBlankInput
          value={answer || ""}
          onChange={(v) => handleChange(v)}
          submitted={submitted}
        />
      )}

      {type === "matching_headings" && (
        <MatchingHeadingsOptions
          headings={question.headings}
          selected={answer}
          onSelect={handleChange}
          submitted={submitted}
          correctAnswer={question.answer}
        />
      )}

      {type === "matching_information" && (
        <MatchingInformationOptions
          statements={question.statements}
          paragraphs={question.paragraphs}
          answers={typeof answer === "object" ? answer : {}}
          onSelect={(idx, para) => handleChange({ ...(typeof answer === "object" ? answer : {}), [idx]: para })}
          submitted={submitted}
          correctAnswers={question.answers}
        />
      )}

      {type === "summary_completion" && (
        <SummaryCompletionInput
          summary={question.summary}
          wordBox={question.word_box}
          answers={Array.isArray(answer) ? answer : []}
          onSelect={(vals) => handleChange(vals)}
          submitted={submitted}
          correctAnswers={question.answers}
        />
      )}

      {/* AI explanation shown after submission */}
      {submitted && feedback?.explanation && (
        <p className="mt-3 text-xs text-gray-400 border-t border-gray-700 pt-2">
          {feedback.explanation}
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function QuestionText({ question }) {
  const text =
    question.question ||
    question.title ||
    question.prompt ||
    question.statement ||
    question.sentence ||
    "";
  return <p className="text-sm text-gray-200 leading-snug">{text}</p>;
}

function MCQOptions({ options, selected, onSelect, submitted, correctAnswer }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const letter = opt.charAt(0);
        const isSelected = selected === letter;
        const isCorrect  = submitted && letter === correctAnswer;
        const isWrong    = submitted && isSelected && letter !== correctAnswer;

        return (
          <button
            key={opt}
            onClick={() => onSelect(letter)}
            disabled={submitted}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors
              ${isCorrect  ? "border-green-500 bg-green-500/10 text-green-300" : ""}
              ${isWrong    ? "border-red-500 bg-red-500/10 text-red-300" : ""}
              ${!isCorrect && !isWrong && isSelected
                ? "border-accent-500 bg-accent-500/10 text-accent-300"
                : ""}
              ${!isCorrect && !isWrong && !isSelected
                ? "border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                : ""}
            `}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TFNGOptions({ selected, onSelect, submitted, correctAnswer }) {
  const options = ["TRUE", "FALSE", "NOT GIVEN"];
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const isSelected = selected === opt;
        const isCorrect  = submitted && opt === correctAnswer;
        const isWrong    = submitted && isSelected && opt !== correctAnswer;

        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            disabled={submitted}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors
              ${isCorrect  ? "border-green-500 bg-green-500/10 text-green-300" : ""}
              ${isWrong    ? "border-red-500 bg-red-500/10 text-red-300" : ""}
              ${!isCorrect && !isWrong && isSelected
                ? "border-accent-500 bg-accent-500/10 text-accent-300"
                : ""}
              ${!isCorrect && !isWrong && !isSelected
                ? "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800"
                : ""}
            `}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FillBlankInput({ value, onChange, submitted }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      disabled={submitted}
      placeholder="Type your answer…"
      className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white
        placeholder-gray-500 outline-none transition-colors
        ${submitted ? "opacity-60 cursor-not-allowed border-gray-700" : "border-gray-600 focus:border-accent-500"}
      `}
    />
  );
}

/**
 * Matching Information: match each statement to a paragraph letter (A, B, C…).
 * answers is an object: { "0": "B", "1": "A" } keyed by statement index.
 */
function MatchingInformationOptions({ statements = [], paragraphs = [], answers = {}, onSelect, submitted, correctAnswers = {} }) {
  return (
    <div className="space-y-3">
      {statements.map((stmt, i) => {
        const selected = answers[i] || answers[String(i + 1)] || "";
        const correct  = correctAnswers[i] || correctAnswers[String(i + 1)] || "";
        const isCorrect = submitted && selected.toUpperCase() === correct.toUpperCase();
        const isWrong   = submitted && selected && !isCorrect;

        return (
          <div key={i} className="space-y-1.5">
            <p className="text-xs text-gray-400">{i + 1}. {stmt}</p>
            <div className="flex gap-2 flex-wrap">
              {paragraphs.map((para) => {
                const isSelected = selected.toUpperCase() === para.toUpperCase();
                const isParaCorrect = submitted && para.toUpperCase() === correct.toUpperCase();
                const isParaWrong   = submitted && isSelected && !isParaCorrect;

                return (
                  <button
                    key={para}
                    onClick={() => onSelect(i, para)}
                    disabled={submitted}
                    className={`text-xs font-bold w-8 h-8 rounded-lg border transition-colors
                      ${isParaCorrect ? "border-green-500 bg-green-500/10 text-green-300" : ""}
                      ${isParaWrong   ? "border-red-500 bg-red-500/10 text-red-300" : ""}
                      ${!isParaCorrect && !isParaWrong && isSelected
                        ? "border-accent-500 bg-accent-500/10 text-accent-300" : ""}
                      ${!isParaCorrect && !isParaWrong && !isSelected
                        ? "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800" : ""}
                    `}
                  >
                    {para}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Summary Completion: fill blanks in a summary paragraph using words from a word box.
 * answers is an array of selected words (one per blank).
 */
function SummaryCompletionInput({ summary = "", wordBox = [], answers = [], onSelect, submitted, correctAnswers = [] }) {
  const blanks = (summary.match(/___/g) || []).length;

  const toggleWord = (word) => {
    if (submitted) return;
    const idx = answers.indexOf(word);
    if (idx >= 0) {
      onSelect(answers.filter((w) => w !== word));
    } else if (answers.length < blanks) {
      onSelect([...answers, word]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary with blanks shown as numbered slots */}
      <div className="text-sm text-gray-300 leading-relaxed bg-gray-800/50 rounded-lg p-3">
        {summary.split("___").map((part, i) => (
          <span key={i}>
            {part}
            {i < blanks && (
              <span className={`inline-block min-w-[80px] border-b-2 mx-1 text-center text-xs font-medium
                ${submitted
                  ? answers[i]?.toLowerCase() === correctAnswers[i]?.toLowerCase()
                    ? "border-green-500 text-green-300"
                    : "border-red-500 text-red-300"
                  : "border-accent-500 text-accent-300"}`}
              >
                {answers[i] || `(${i + 1})`}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Word box */}
      <div className="flex flex-wrap gap-2">
        {wordBox.map((word) => {
          const isSelected = answers.includes(word);
          const isCorrect  = submitted && correctAnswers.includes(word) && isSelected;
          const isWrong    = submitted && isSelected && !correctAnswers.includes(word);

          return (
            <button
              key={word}
              onClick={() => toggleWord(word)}
              disabled={submitted}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                ${isCorrect ? "border-green-500 bg-green-500/10 text-green-300" : ""}
                ${isWrong   ? "border-red-500 bg-red-500/10 text-red-300" : ""}
                ${!isCorrect && !isWrong && isSelected
                  ? "border-accent-500 bg-accent-500/10 text-accent-300" : ""}
                ${!isCorrect && !isWrong && !isSelected
                  ? "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800" : ""}
              `}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingHeadingsOptions({ headings, selected, onSelect, submitted, correctAnswer }) {
  return (
    <div className="space-y-1.5">
      {headings.map((heading) => {
        const roman = heading.split(".")[0].trim();
        const isSelected = selected === roman;
        const isCorrect  = submitted && roman === correctAnswer;
        const isWrong    = submitted && isSelected && roman !== correctAnswer;

        return (
          <button
            key={heading}
            onClick={() => onSelect(roman)}
            disabled={submitted}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors
              ${isCorrect  ? "border-green-500 bg-green-500/10 text-green-300" : ""}
              ${isWrong    ? "border-red-500 bg-red-500/10 text-red-300" : ""}
              ${!isCorrect && !isWrong && isSelected
                ? "border-accent-500 bg-accent-500/10 text-accent-300"
                : ""}
              ${!isCorrect && !isWrong && !isSelected
                ? "border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                : ""}
            `}
          >
            {heading}
          </button>
        );
      })}
    </div>
  );
}
