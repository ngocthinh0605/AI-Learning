import React, { useState } from "react";
import { Sparkles, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { useReadingSession } from "../../../hooks/useReadingSession";
import PassageViewer from "./PassageViewer";
import QuestionPanel from "./QuestionPanel";
import FeedbackPanel from "./FeedbackPanel";

const DIFFICULTIES = [
  { value: "band_5", label: "Band 5", desc: "Intermediate" },
  { value: "band_6", label: "Band 6", desc: "Upper-Intermediate" },
  { value: "band_7", label: "Band 7", desc: "Advanced" },
  { value: "band_8", label: "Band 8", desc: "Near-Native" },
];

const PASSAGE_TYPES = [
  { value: "academic", label: "Academic" },
  { value: "general",  label: "General Training" },
];

export default function PassagePracticeTab() {
  const [difficulty,   setDifficulty]   = useState("band_6");
  const [passageType,  setPassageType]  = useState("academic");
  const [topic,        setTopic]        = useState("");

  const {
    passage, answers, attempt, generating, submitting, error,
    answeredCount, totalQuestions, allAnswered,
    generate, setAnswer, handleSubmit, reset,
  } = useReadingSession();

  const handleGenerate = () => {
    generate({ difficulty, topic: topic.trim() || undefined, passageType });
  };

  // ── After submission: show feedback ──────────────────────────────────────
  if (attempt) {
    return (
      <FeedbackPanel
        attempt={attempt}
        passage={passage}
        onRetry={reset}
      />
    );
  }

  // ── No passage yet: show configuration form ───────────────────────────────
  if (!passage) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Practice Reading</h2>
          <p className="text-sm text-gray-400">
            Generate an AI-powered IELTS passage and answer comprehension questions.
          </p>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`p-3 rounded-xl border text-left transition-colors
                  ${difficulty === d.value
                    ? "border-accent-500 bg-accent-500/10"
                    : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                  }`}
              >
                <div className={`text-sm font-semibold ${difficulty === d.value ? "text-accent-400" : "text-white"}`}>
                  {d.label}
                </div>
                <div className="text-xs text-gray-500">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Passage type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Passage Type</label>
          <div className="flex gap-2">
            {PASSAGE_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setPassageType(pt.value)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${passageType === pt.value
                    ? "border-accent-500 bg-accent-500/10 text-accent-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Topic <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. climate change, artificial intelligence…"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-accent-500 transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Generating passage…</>
          ) : (
            <><Sparkles size={16} /> Generate Passage</>
          )}
        </button>
      </div>
    );
  }

  // ── Passage loaded: split view ────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left: passage */}
      <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6 overflow-y-auto max-h-[75vh]">
        <PassageViewer passage={passage} />
      </div>

      {/* Right: questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            Questions ({answeredCount}/{totalQuestions} answered)
          </h3>
          <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            New passage
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 rounded-full transition-all"
            style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
          {passage.questions.map((q) => (
            <QuestionPanel
              key={q.id}
              question={q}
              answer={answers[String(q.id)] || ""}
              onChange={setAnswer}
              submitted={false}
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !allAnswered}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Evaluating…</>
          ) : (
            <><ChevronRight size={16} /> Submit Answers</>
          )}
        </button>
        {!allAnswered && !submitting && (
          <p className="text-xs text-center text-gray-500">
            Answer all {totalQuestions} questions to submit
          </p>
        )}
      </div>
    </div>
  );
}
