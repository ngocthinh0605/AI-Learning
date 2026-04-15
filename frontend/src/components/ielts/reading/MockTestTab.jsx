import React, { useState } from "react";
import { Timer, Sparkles, ChevronRight, AlertCircle, Loader2, Play } from "lucide-react";
import { useReadingSession } from "../../../hooks/useReadingSession";
import PassageViewer from "./PassageViewer";
import QuestionPanel from "./QuestionPanel";
import FeedbackPanel from "./FeedbackPanel";

const DIFFICULTIES = [
  { value: "band_5", label: "Band 5" },
  { value: "band_6", label: "Band 6" },
  { value: "band_7", label: "Band 7" },
  { value: "band_8", label: "Band 8" },
];

// 60 minutes in seconds — matches real IELTS reading section time
const MOCK_TEST_DURATION = 3600;

export default function MockTestTab() {
  const [difficulty, setDifficulty] = useState("band_6");
  const [started,    setStarted]    = useState(false);

  const {
    passage, answers, attempt, generating, submitting, error,
    answeredCount, totalQuestions, allAnswered,
    formattedTime, timeLeft, timerActive,
    generate, setAnswer, handleSubmit, reset,
  } = useReadingSession({ timedMode: true, timeLimitSeconds: MOCK_TEST_DURATION });

  const handleStart = async () => {
    setStarted(true);
    await generate({ difficulty, passageType: "academic" });
  };

  const handleReset = () => {
    setStarted(false);
    reset();
  };

  // ── After submission: show feedback ──────────────────────────────────────
  if (attempt) {
    return (
      <FeedbackPanel
        attempt={attempt}
        passage={passage}
        onRetry={handleReset}
      />
    );
  }

  // ── Pre-start screen ──────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Timer size={18} className="text-yellow-400" />
            <h3 className="font-semibold text-yellow-300">Mock Test Mode</h3>
          </div>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>60-minute countdown timer (real IELTS conditions)</li>
            <li>Auto-submits when time runs out</li>
            <li>AI-generated passage at your chosen difficulty</li>
            <li>Full band score and feedback after submission</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${difficulty === d.value
                    ? "border-accent-500 bg-accent-500/10 text-accent-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Preparing test…</>
          ) : (
            <><Play size={16} /> Start Mock Test</>
          )}
        </button>
      </div>
    );
  }

  // ── Test in progress ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3
        ${timeLeft < 300 ? "border-red-500/40 bg-red-500/5" : "border-gray-700 bg-gray-800/40"}`}
      >
        <div className="flex items-center gap-2">
          <Timer size={16} className={timeLeft < 300 ? "text-red-400" : "text-yellow-400"} />
          <span className="text-sm text-gray-400">Time Remaining</span>
        </div>
        <span className={`font-mono text-xl font-bold ${timeLeft < 300 ? "text-red-400" : "text-white"}`}>
          {formattedTime}
        </span>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{answeredCount}/{totalQuestions} answered</span>
        </div>
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

      {/* Split view */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6 overflow-y-auto max-h-[65vh]">
          <PassageViewer passage={passage} />
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[65vh] pr-1">
          {passage?.questions.map((q) => (
            <QuestionPanel
              key={q.id}
              question={q}
              answer={answers[String(q.id)] || ""}
              onChange={setAnswer}
              submitted={false}
            />
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Evaluating…</>
            ) : (
              <><ChevronRight size={16} /> Submit Test</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
