import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Mic2, AlertCircle, History, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchSpeakingAttempts, postSpeakingFeedback } from "../../api/speakingFeedbackApi";

const PARTS = [
  { id: "part1", label: "Part 1", prompt: "Introduce yourself and describe your daily routine." },
  { id: "part2", label: "Part 2", prompt: "Describe a memorable journey you took and explain why it mattered." },
  { id: "part3", label: "Part 3", prompt: "How has technology changed the way people communicate in your country?" },
];

export default function SpeakingPage() {
  const navigate = useNavigate();
  const [activePart, setActivePart] = useState(PARTS[0].id);
  const [historyPartFilter, setHistoryPartFilter] = useState("all");
  const [sentence, setSentence] = useState("");
  const [updateProfile, setUpdateProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, per_page: 10, total: 0, total_pages: 0 });

  const selectedAttempt = useMemo(
    () => attempts.find((item) => item.id === selectedAttemptId) || null,
    [attempts, selectedAttemptId]
  );

  async function loadAttempts({ page = 1, append = false } = {}) {
    setHistoryLoading(true);
    try {
      const data = await fetchSpeakingAttempts({
        page,
        perPage: 10,
        part: historyPartFilter === "all" ? undefined : historyPartFilter,
      });
      const fetchedAttempts = Array.isArray(data.attempts) ? data.attempts : [];
      setAttempts((prev) => (append ? [...prev, ...fetchedAttempts] : fetchedAttempts));
      setHistoryMeta(data.meta || { page: 1, per_page: 10, total: fetchedAttempts.length, total_pages: 1 });
    } catch {
      setError("Unable to load speaking attempt history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadAttempts();
  }, [historyPartFilter]);

  async function handleSubmit(e) {
    e.preventDefault();
    const cleaned = sentence.trim();
    if (!cleaned) {
      setError("Please enter your speaking transcript first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const activePrompt = PARTS.find((p) => p.id === activePart)?.prompt;
      const data = await postSpeakingFeedback(cleaned, { updateProfile, part: activePart, prompt: activePrompt });
      setLatestResult(data);
      setSentence("");
      const history = await fetchSpeakingAttempts({
        page: 1,
        perPage: 10,
        part: historyPartFilter === "all" ? undefined : historyPartFilter,
      });
      const nextAttempts = Array.isArray(history.attempts) ? history.attempts : [];
      setAttempts(nextAttempts);
      setHistoryMeta(history.meta || { page: 1, per_page: 10, total: nextAttempts.length, total_pages: 1 });
      if (nextAttempts[0]) setSelectedAttemptId(nextAttempts[0].id);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to generate speaking feedback right now.");
    } finally {
      setLoading(false);
    }
  }

  const review = selectedAttempt?.result || latestResult;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/ielts")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Back to IELTS"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">IELTS Speaking</h1>
          <p className="text-sm text-gray-400">Submit transcripts and get AI score breakdown for fluency, grammar, and pronunciation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 card space-y-5">
          <div className="flex flex-wrap gap-2">
            {PARTS.map((part) => (
              <button
                key={part.id}
                onClick={() => setActivePart(part.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  activePart === part.id ? "bg-accent-500 text-white" : "bg-gray-800 text-gray-300 hover:text-white"
                }`}
              >
                {part.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <p className="text-xs text-gray-400 mb-1">Prompt</p>
            <p className="text-sm text-gray-200">{PARTS.find((p) => p.id === activePart)?.prompt}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="speaking-transcript" className="block text-sm text-gray-300 mb-2">Transcript</label>
              <textarea
                id="speaking-transcript"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                rows={5}
                className="input-field w-full"
                placeholder="Paste or type your spoken answer transcript..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={updateProfile}
                onChange={(e) => setUpdateProfile(e.target.checked)}
                className="accent-accent-500"
              />
              Update my long-term learning profile with this attempt
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Mic2 size={16} />
              {loading ? "Evaluating..." : "Evaluate Speaking"}
            </button>
          </form>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2"><History size={16} /> Attempts</h2>
            <button onClick={() => loadAttempts({ page: 1 })} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={historyPartFilter}
              onChange={(e) => setHistoryPartFilter(e.target.value)}
              className="input-field text-sm"
              aria-label="Filter attempt history by part"
            >
              <option value="all">All parts</option>
              {PARTS.map((part) => (
                <option key={part.id} value={part.id}>{part.label}</option>
              ))}
            </select>
          </div>
          {historyLoading ? (
            <p className="text-sm text-gray-500">Loading attempts...</p>
          ) : attempts.length === 0 ? (
            <p className="text-sm text-gray-500">No attempts yet.</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  onClick={() => setSelectedAttemptId(attempt.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedAttemptId === attempt.id ? "border-accent-500/50 bg-accent-500/10" : "border-gray-800 bg-gray-900/30"
                  }`}
                >
                  <p className="text-xs text-gray-400 uppercase">{attempt.part}</p>
                  <p className="text-sm text-gray-200 truncate">{attempt.sentence}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{new Date(attempt.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
          {!historyLoading && historyMeta.page < historyMeta.total_pages && (
            <button
              onClick={() => loadAttempts({ page: historyMeta.page + 1, append: true })}
              className="btn-ghost text-sm w-full"
            >
              Load more
            </button>
          )}
        </section>
      </div>

      {review && (
        <section className="card mt-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Attempt Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScoreCard label="Fluency" value={review?.scores?.fluency} />
            <ScoreCard label="Grammar" value={review?.scores?.grammar} />
            <ScoreCard label="Pronunciation" value={review?.scores?.pronunciation} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Corrected sentence</p>
            <p className="text-sm text-gray-200">{review.corrected_sentence || "No correction provided."}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value ?? "-"}</p>
      <p className="text-xs text-gray-500">Band / 9</p>
    </div>
  );
}
