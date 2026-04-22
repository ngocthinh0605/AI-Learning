import React, { useEffect, useState } from "react";
import { ChevronLeft, Headphones, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchListeningAttempts, generateListeningPassage, submitListeningAnswers } from "../../api/listeningApi";

export default function ListeningPage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("band_6");
  const [topic, setTopic] = useState("");
  const [passage, setPassage] = useState(null);
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await fetchListeningAttempts(1);
      setHistory(data.attempts || []);
    } catch (e) {
      setHistory([]);
      setHistoryError(e?.response?.data?.error || "Failed to load listening history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const data = await generateListeningPassage({ difficulty, topic: topic.trim() || undefined });
      setPassage(data);
      setAttempt(null);
      setAnswers({});
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to generate listening set.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!passage) return;
    setLoading(true);
    setError("");
    try {
      const data = await submitListeningAnswers({
        title: passage.title,
        transcript: passage.transcript,
        questions: passage.questions,
        answers,
        difficulty: passage.difficulty,
        topic: passage.topic,
      });
      setAttempt(data);
      loadHistory();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to submit answers.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/ielts")} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">IELTS Listening</h1>
          <p className="text-sm text-gray-400">Practice listening comprehension with transcript-based tasks.</p>
        </div>
      </div>

      {!passage && (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {["band_5", "band_6", "band_7", "band_8"].map((b) => (
              <button key={b} onClick={() => setDifficulty(b)} className={`p-2 rounded-lg border ${difficulty === b ? "border-accent-500 text-accent-400" : "border-gray-700 text-gray-300"}`}>
                {b.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
          <input className="input-field w-full" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" />
          <button onClick={handleGenerate} className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Headphones size={16} />}
            {loading ? "Generating..." : "Generate Listening Set"}
          </button>
        </div>
      )}

      {passage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <h2 className="text-white font-semibold">{passage.title}</h2>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{passage.transcript}</p>
          </div>
          <div className="card space-y-3">
            {passage.questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-gray-800 p-3">
                <p className="text-sm text-white mb-2">{q.question || q.statement}</p>
                <input
                  className="input-field w-full"
                  value={answers[String(q.id)] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                  placeholder="Your answer"
                />
              </div>
            ))}
            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
              {loading ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        </div>
      )}

      {attempt && (
        <div className="card mt-6">
          <h3 className="text-white font-semibold mb-1">Latest Result</h3>
          <p className="text-sm text-gray-300">
            Score: {attempt.score}/{attempt.total_questions} (Band {attempt.feedback?.band_score ?? "-"})
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Recent Listening Attempts</h3>
          <button onClick={loadHistory} className="btn-ghost text-xs">Retry history</button>
        </div>
        {historyLoading ? (
          <p className="text-sm text-gray-500">Loading history...</p>
        ) : historyError ? (
          <p className="text-sm text-red-400">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">No attempts yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-gray-800 p-3">
                <p className="text-sm text-white">{h.title || "Listening attempt"}</p>
                <p className="text-xs text-gray-400">Score: {h.score}/{h.total_questions}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
