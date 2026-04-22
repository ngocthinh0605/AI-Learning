import React, { useEffect, useMemo, useState } from "react";
import { fetchDailyLearningPlanHistory, postDailyLearningPlan } from "../api/dailyLearningPlanApi";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TRENDS = ["declining", "stable", "improving"];
const TASK_TYPE_LABELS = {
  reading_training: "Reading Practice",
  vocab_training: "Vocabulary Practice",
  inference_training: "Inference Practice",
  paraphrase_training: "Paraphrase Practice",
  speaking_practice: "Speaking Practice",
  listening_practice: "Listening Practice",
  writing_reasoning: "Writing Reasoning",
  writing_micro_task: "Writing Micro Task",
};

export default function DailyLearningPlanPage() {
  const [englishLevel, setEnglishLevel] = useState("B1");
  const [speakingPronunciation, setSpeakingPronunciation] = useState(5.5);
  const [readingAccuracy, setReadingAccuracy] = useState(0.45);
  const [inferenceAccuracy, setInferenceAccuracy] = useState(0.35);
  const [trend, setTrend] = useState("declining");
  const [targetBand, setTargetBand] = useState(7.0);
  const [examDate, setExamDate] = useState("2026-09-01");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const canSubmit = useMemo(() => {
    return Number(dailyMinutes) > 0 && Number(targetBand) > 0 && Number(targetBand) <= 9 && examDate.trim().length > 0;
  }, [dailyMinutes, targetBand, examDate]);

  const crossSkillMix = useMemo(() => {
    const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
    if (tasks.length === 0) return [];

    const totals = tasks.reduce((acc, task) => {
      const taskType = task?.type || "reading_training";
      const minutes = Number(task?.duration_minutes || 0);
      acc[taskType] = (acc[taskType] || 0) + Math.max(0, minutes);
      return acc;
    }, {});
    const totalMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
    if (totalMinutes <= 0) return [];

    return Object.entries(totals)
      .map(([type, minutes]) => ({
        type,
        minutes,
        percent: Math.round((minutes / totalMinutes) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [plan]);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await fetchDailyLearningPlanHistory(1);
      setHistory(data.attempts || []);
    } catch (err) {
      setHistory([]);
      setHistoryError(err?.response?.data?.error || "Failed to load plan history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function buildPayload() {
    return {
      learningProfileJson: {
        english_level: englishLevel,
        speaking_pronunciation: Number(speakingPronunciation),
      },
      recentPerformanceJson: {
        reading_accuracy: Number(readingAccuracy),
        inference_accuracy: Number(inferenceAccuracy),
        trend,
      },
      learningGoalJson: {
        target_band: Number(targetBand),
        exam_date: examDate,
      },
      dailyTimeMinutes: Number(dailyMinutes),
    };
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!canSubmit) throw new Error("Please complete all required fields.");
      const payload = buildPayload();
      const data = await postDailyLearningPlan(payload);
      setLastPayload(payload);
      setPlan(data);
      loadHistory();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Daily Learning Plan</h1>
      <p className="text-sm text-gray-400 mb-6">Generate a strict, weakness-focused plan from profile and recent performance.</p>
      <form onSubmit={handleGenerate} className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="English level">
            <select className="input-field w-full" value={englishLevel} onChange={(e) => setEnglishLevel(e.target.value)}>
              {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </Field>
          <Field label="Speaking pronunciation score (0-9)">
            <input className="input-field w-full" type="number" min={0} max={9} step={0.1} value={speakingPronunciation} onChange={(e) => setSpeakingPronunciation(e.target.value)} />
          </Field>
          <Field label="Reading accuracy (0-1)">
            <input className="input-field w-full" type="number" min={0} max={1} step={0.01} value={readingAccuracy} onChange={(e) => setReadingAccuracy(e.target.value)} />
          </Field>
          <Field label="Inference accuracy (0-1)">
            <input className="input-field w-full" type="number" min={0} max={1} step={0.01} value={inferenceAccuracy} onChange={(e) => setInferenceAccuracy(e.target.value)} />
          </Field>
          <Field label="Recent trend">
            <select className="input-field w-full" value={trend} onChange={(e) => setTrend(e.target.value)}>
              {TRENDS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Target IELTS band (0-9)">
            <input className="input-field w-full" type="number" min={0} max={9} step={0.1} value={targetBand} onChange={(e) => setTargetBand(e.target.value)} />
          </Field>
        </div>
        <Field label="Exam date">
          <input className="input-field w-full md:w-64" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </Field>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Daily time (minutes)</label>
          <input type="number" min={10} className="input-field w-40" value={dailyMinutes} onChange={(e) => setDailyMinutes(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={loading || !canSubmit}>{loading ? "Generating..." : "Generate Daily Plan"}</button>
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            {lastPayload && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const data = await postDailyLearningPlan(lastPayload);
                    setPlan(data);
                  } catch (err) {
                    setError(err?.response?.data?.error || err.message || "Failed to generate plan");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Retry last request
              </button>
            )}
          </div>
        )}
      </form>

      <div className="card mt-6">
        {!plan ? (
          <p className="text-sm text-gray-500">No plan generated yet.</p>
        ) : (
          <>
            <h2 className="text-white font-semibold mb-3">Plan Summary</h2>
            <p className="text-sm text-gray-300">Main focus: {plan.summary?.main_focus}</p>
            <p className="text-sm text-gray-400 mb-3">{plan.summary?.reason}</p>
            <div className="space-y-2 mb-4">
              {(plan.tasks || []).map((task, idx) => (
                <div key={`${task.type}-${idx}`} className="rounded-lg border border-gray-800 p-3">
                  <p className="text-sm text-white">{humanizeTaskType(task.type)} - {task.focus}</p>
                  <p className="text-xs text-gray-400">{task.duration_minutes} min</p>
                  <p className="text-xs text-gray-500 mt-1">{task.reason}</p>
                </div>
              ))}
            </div>
            {crossSkillMix.length > 0 && (
              <div className="rounded-lg border border-accent-500/20 bg-accent-500/5 p-3">
                <h3 className="text-sm text-accent-300 mb-2">Cross-Skill Mix</h3>
                <ul className="space-y-1">
                  {crossSkillMix.map((item) => (
                    <li key={item.type} className="text-xs text-gray-300">
                      {humanizeTaskType(item.type)}: {item.minutes} min ({item.percent}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent Daily Plans</h2>
          <button className="btn-ghost text-xs" onClick={loadHistory}>Refresh history</button>
        </div>
        {historyLoading ? (
          <p className="text-sm text-gray-500">Loading history...</p>
        ) : historyError ? (
          <p className="text-sm text-red-400">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">No saved plans yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                className="w-full text-left rounded-lg border border-gray-800 p-3 hover:border-accent-500/50 transition-colors"
                onClick={() => setPlan(item.plan)}
              >
                <p className="text-sm text-white">
                  {item.plan?.summary?.main_focus || "Daily plan"} · {item.daily_time_minutes || "-"} min
                </p>
                {historyMixLabel(item.plan) && (
                  <p className="text-xs text-accent-300 mt-1">{historyMixLabel(item.plan)}</p>
                )}
                <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-2">{label}</label>
      {children}
    </div>
  );
}

function humanizeTaskType(type) {
  return TASK_TYPE_LABELS[type] || "Practice Task";
}

function historyMixLabel(plan) {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  if (tasks.length === 0) return "";

  const totals = tasks.reduce((acc, task) => {
    const taskType = task?.type || "reading_training";
    const minutes = Number(task?.duration_minutes || 0);
    acc[taskType] = (acc[taskType] || 0) + Math.max(0, minutes);
    return acc;
  }, {});
  const totalMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (totalMinutes <= 0) return "";

  const topTwo = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, minutes]) => {
      const percent = Math.round((minutes / totalMinutes) * 100);
      return `${humanizeTaskType(type)} ${percent}%`;
    });

  return `Mix: ${topTwo.join(" / ")}`;
}
