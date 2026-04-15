import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Filter, X, Brain } from "lucide-react";
import { fetchVocabularyWords, reviewVocabularyWordBinary, deleteVocabularyWord } from "../api/vocabularyApi";
import VocabCard from "../components/vocabulary/VocabCard";
import toast from "react-hot-toast";

const WORD_TYPES = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection", "phrase"];

// Color map must match VocabCard so filter chips look consistent
const WORD_TYPE_COLORS = {
  noun:         "text-blue-300 bg-blue-400/15 border-blue-400/30",
  verb:         "text-green-300 bg-green-400/15 border-green-400/30",
  adjective:    "text-purple-300 bg-purple-400/15 border-purple-400/30",
  adverb:       "text-yellow-300 bg-yellow-400/15 border-yellow-400/30",
  pronoun:      "text-pink-300 bg-pink-400/15 border-pink-400/30",
  preposition:  "text-orange-300 bg-orange-400/15 border-orange-400/30",
  conjunction:  "text-teal-300 bg-teal-400/15 border-teal-400/30",
  interjection: "text-red-300 bg-red-400/15 border-red-400/30",
  phrase:       "text-indigo-300 bg-indigo-400/15 border-indigo-400/30",
};

export default function VocabularyPage() {
  const navigate = useNavigate();
  const [words, setWords]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dueOnly, setDueOnly]       = useState(false);
  const [typeFilter, setTypeFilter] = useState(null); // null = all types

  async function load() {
    setLoading(true);
    try {
      const data = await fetchVocabularyWords({ dueForReview: dueOnly });
      setWords(data);
    } catch {
      toast.error("Failed to load vocabulary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [dueOnly]);

  async function handleReview(id, result) {
    try {
      const updated = await reviewVocabularyWordBinary({ id, result });
      setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
      toast.success(result === "success" ? "Great! Mastery increased." : "Keep practicing!");
    } catch {
      toast.error("Review failed");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteVocabularyWord(id);
      setWords((prev) => prev.filter((w) => w.id !== id));
      toast.success("Word removed");
    } catch {
      toast.error("Delete failed");
    }
  }

  // Called by VocabCard when the word type changes (AI or manual) so the list
  // stays in sync without a full reload.
  const handleWordTypeChange = useCallback((id, newType) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, word_type: newType } : w)));
  }, []);

  // Apply client-side type filter on top of the loaded list
  const displayed = typeFilter
    ? words.filter((w) => w.word_type === typeFilter)
    : words;

  const dueCount = words.filter(
    (w) => !w.next_review_at || new Date(w.next_review_at) <= new Date()
  ).length;

  // Only show type chips for types that exist in the current word list
  const presentTypes = WORD_TYPES.filter((t) => words.some((w) => w.word_type === t));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={24} className="text-accent-400" />
            Vocabulary
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {words.length} word{words.length !== 1 ? "s" : ""} · {dueCount} due for review
          </p>
        </div>

        <button
          onClick={() => setDueOnly(!dueOnly)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
            dueOnly
              ? "bg-accent-500/20 border-accent-500/30 text-accent-300"
              : "border-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          <Filter size={14} />
          {dueOnly ? "Showing Due" : "All Words"}
        </button>
      </div>

      {/* ── Start Review banner (shown when words are due) ── */}
      {dueCount > 0 && (
        <button
          onClick={() => navigate("/vocabulary/review")}
          className="w-full mb-5 flex items-center gap-3 bg-accent-500/10 hover:bg-accent-500/20
            border border-accent-500/30 rounded-xl px-5 py-3.5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0">
            <Brain size={18} className="text-accent-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">
              {dueCount} word{dueCount !== 1 ? "s" : ""} due for review
            </p>
            <p className="text-accent-300/70 text-xs">Start your spaced repetition session →</p>
          </div>
        </button>
      )}

      {/* ── Word type filter chips ── */}
      {presentTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {/* "All" chip */}
          <button
            onClick={() => setTypeFilter(null)}
            className={`text-xs px-3 py-1 rounded-full border font-medium capitalize transition-colors ${
              typeFilter === null
                ? "bg-accent-500/20 border-accent-500/30 text-accent-300"
                : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500"
            }`}
          >
            All
          </button>

          {presentTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`text-xs px-3 py-1 rounded-full border font-medium capitalize transition-colors ${
                typeFilter === t
                  ? WORD_TYPE_COLORS[t]
                  : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500"
              }`}
            >
              {t}
              {typeFilter === t && (
                <X size={10} className="inline ml-1 -mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Word list ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading vocabulary…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>
            {typeFilter
              ? `No ${typeFilter}s yet. Click ✨ on a card to let AI classify it!`
              : dueOnly
              ? "No words due for review right now!"
              : "No saved words yet. Practice and save words from conversations!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((word) => (
            <VocabCard
              key={word.id}
              word={word}
              onReview={handleReview}
              onDelete={handleDelete}
              onWordTypeChange={handleWordTypeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
