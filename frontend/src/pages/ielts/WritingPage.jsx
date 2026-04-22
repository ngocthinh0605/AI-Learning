import React, { useEffect, useState } from "react";
import { ChevronLeft, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchWritingAttempts, gradeWritingEssay } from "../../api/writingApi";

const DEFAULT_PROMPT_TASK_2 = "Some people think university education should be free for everyone. Discuss both views and give your opinion.";

export default function WritingPage() {
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState("task_2");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_TASK_2);
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAttempts() {
    try {
      const data = await fetchWritingAttempts(1);
      setAttempts(data.attempts || []);
    } catch {
      setAttempts([]);
    }
  }

  useEffect(() => {
    loadAttempts();
  }, []);

  async function handleGrade(e) {
    e.preventDefault();
    if (!prompt.trim() || !essay.trim()) {
      setError("Prompt and essay are required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await gradeWritingEssay({ taskType, prompt: prompt.trim(), essay: essay.trim() });
      setResult(data);
      loadAttempts();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to grade essay.");
    } finally {
      setLoading(false);
    }
  }

  const criteria = result?.grading?.criteria || null;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/ielts")} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">IELTS Writing</h1>
          <p className="text-sm text-gray-400">Get AI rubric grading for IELTS Task 1/Task 2 essays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleGrade} className="card space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setTaskType("task_1")} className={`px-3 py-2 rounded-lg text-sm ${taskType === "task_1" ? "bg-accent-500 text-white" : "bg-gray-800 text-gray-300"}`}>Task 1</button>
            <button type="button" onClick={() => setTaskType("task_2")} className={`px-3 py-2 rounded-lg text-sm ${taskType === "task_2" ? "bg-accent-500 text-white" : "bg-gray-800 text-gray-300"}`}>Task 2</button>
          </div>
          <div>
            <label htmlFor="writing-prompt" className="block text-sm text-gray-300 mb-2">Prompt</label>
            <textarea id="writing-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="input-field w-full" />
          </div>
          <div>
            <label htmlFor="writing-essay" className="block text-sm text-gray-300 mb-2">Essay</label>
            <textarea id="writing-essay" value={essay} onChange={(e) => setEssay(e.target.value)} rows={12} className="input-field w-full" placeholder="Write your response here..." />
          </div>
          <button disabled={loading} className="btn-primary flex items-center gap-2">
            <PenLine size={16} />
            {loading ? "Grading..." : "Grade Essay"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>

        <div className="card space-y-4">
          <h2 className="text-white font-semibold">Latest Grading</h2>
          {!result ? (
            <p className="text-sm text-gray-500">Submit an essay to see rubric scores.</p>
          ) : (
            <>
              <p className="text-sm text-gray-300">Overall band: <span className="text-white font-semibold">{result.grading?.overall_band}</span></p>
              {criteria && (
                <div className="space-y-2">
                  {Object.entries(criteria).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-800 p-3">
                      <p className="text-sm text-white">{key.replaceAll("_", " ")}</p>
                      <p className="text-xs text-gray-400">Score: {value.score}</p>
                      <p className="text-xs text-gray-500 mt-1">{value.feedback}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="text-white font-semibold mb-3">Recent Writing Attempts</h3>
        {attempts.length === 0 ? (
          <p className="text-sm text-gray-500">No attempts yet.</p>
        ) : (
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-800 p-3">
                <p className="text-sm text-white">{a.task_type?.toUpperCase()} - Band {a.grading?.overall_band ?? "-"}</p>
                <p className="text-xs text-gray-500 truncate">{a.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
