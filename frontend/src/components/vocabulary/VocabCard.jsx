import React, { useState } from "react";
import { Trash2, CheckCircle, XCircle, Sparkles, Volume2, Loader2 } from "lucide-react";
import { enrichVocabularyWord, updateVocabularyWordType } from "../../api/vocabularyApi";
import { useTTS } from "../../hooks/useTTS";
import toast from "react-hot-toast";

const MASTERY_LABELS = ["", "New", "Learning", "Familiar", "Known", "Mastered"];
const MASTERY_COLORS = [
  "",
  "text-red-400 bg-red-400/10",
  "text-orange-400 bg-orange-400/10",
  "text-yellow-400 bg-yellow-400/10",
  "text-blue-400 bg-blue-400/10",
  "text-green-400 bg-green-400/10",
];

// Each word type gets its own accent color so learners can visually scan by type
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

const WORD_TYPES = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection", "phrase"];

export default function VocabCard({ word, onReview, onDelete, onWordTypeChange }) {
  const isDue = !word.next_review_at || new Date(word.next_review_at) <= new Date();
  const { speak } = useTTS();

  // AI-generated enrichment stored in local state — persists while card is mounted.
  // word_type from enrichment also gets saved to the server so it survives reloads.
  const [enriched, setEnriched]     = useState(null);
  const [enriching, setEnriching]   = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [savingType, setSavingType]   = useState(false);

  // Resolved word type: prefer server value, then AI-generated value
  const resolvedWordType = word.word_type || enriched?.word_type || null;

  async function handleEnrich() {
    if (enriching) return;
    setEnriching(true);
    try {
      const data = await enrichVocabularyWord(word.id);
      setEnriched(data);
      // Notify parent so the list can update without a full reload
      if (data.word_type) onWordTypeChange?.(word.id, data.word_type);
    } catch {
      toast.error("AI enrichment failed — is Ollama running?");
    } finally {
      setEnriching(false);
    }
  }

  async function handleWordTypeSelect(type) {
    setEditingType(false);
    if (type === resolvedWordType) return;
    setSavingType(true);
    try {
      await updateVocabularyWordType(word.id, type);
      onWordTypeChange?.(word.id, type);
    } catch {
      toast.error("Failed to save word type");
    } finally {
      setSavingType(false);
    }
  }

  function handleSpeak() {
    const text = enriched?.example_sentence
      ? `${word.word}. Example: ${enriched.example_sentence}`
      : word.word;
    speak(text);
  }

  return (
    <div className="card hover:border-gray-700 transition-colors">
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">

          {/* Word + badges row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-white text-lg">{word.word}</h3>

            {/* Mastery badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MASTERY_COLORS[word.mastery_level]}`}>
              {MASTERY_LABELS[word.mastery_level]}
            </span>

            {/* Word type badge — click to change manually */}
            {resolvedWordType ? (
              <div className="relative">
                <button
                  onClick={() => setEditingType((v) => !v)}
                  disabled={savingType}
                  title="Click to change word type"
                  className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize transition-colors cursor-pointer
                    ${WORD_TYPE_COLORS[resolvedWordType] ?? "text-gray-300 bg-gray-700 border-gray-600"}`}
                >
                  {savingType ? "…" : resolvedWordType}
                </button>

                {/* Dropdown to manually pick a different type */}
                {editingType && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[140px]">
                    {WORD_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleWordTypeSelect(t)}
                        className={`w-full text-left px-3 py-1.5 text-xs capitalize hover:bg-gray-800 transition-colors
                          ${t === resolvedWordType ? "text-accent-300 font-medium" : "text-gray-300"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* No type yet — show a subtle "set type" prompt */
              <div className="relative">
                <button
                  onClick={() => setEditingType((v) => !v)}
                  title="Set word type"
                  className="text-xs px-2 py-0.5 rounded-full text-gray-600 border border-dashed border-gray-700 hover:text-gray-400 hover:border-gray-500 transition-colors"
                >
                  + type
                </button>
                {editingType && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[140px]">
                    {WORD_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleWordTypeSelect(t)}
                        className="w-full text-left px-3 py-1.5 text-xs capitalize text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* IPA pronunciation badge — shown once AI enrichment arrives */}
            {enriched?.pronunciation && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 font-mono border border-accent-500/20">
                {enriched.pronunciation}
              </span>
            )}
          </div>

          {/* Definition */}
          <p className="text-gray-400 text-sm">{word.definition}</p>

          {/* Original context sentence */}
          {word.context_sentence && (
            <p className="text-gray-500 text-xs mt-1.5 italic">"{word.context_sentence}"</p>
          )}

          {/* AI-generated example sentence */}
          {enriched?.example_sentence && (
            <div className="mt-2 flex items-start gap-1.5">
              <Sparkles size={11} className="text-accent-400 flex-shrink-0 mt-0.5" />
              <p className="text-accent-200/80 text-xs italic">"{enriched.example_sentence}"</p>
            </div>
          )}
        </div>

        {/* ── Right-side action buttons ── */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button onClick={handleSpeak} title="Listen" className="text-gray-500 hover:text-accent-400 transition-colors">
            <Volume2 size={15} />
          </button>

          <button
            onClick={handleEnrich}
            disabled={enriching}
            title={enriched ? "Re-generate AI enrichment" : "Generate type, pronunciation & example with AI"}
            className={`transition-colors ${
              enriching
                ? "text-accent-400"
                : enriched
                ? "text-accent-500 hover:text-accent-300"
                : "text-gray-500 hover:text-accent-400"
            }`}
          >
            {enriching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          </button>

          <button onClick={() => onDelete(word.id)} className="text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Review row ── */}
      {isDue && onReview && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
          <span className="text-xs text-gray-500 flex-1">Review due</span>
          <button
            onClick={() => onReview(word.id, "failure")}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1 rounded-lg transition-colors"
          >
            <XCircle size={13} /> Hard
          </button>
          <button
            onClick={() => onReview(word.id, "success")}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 bg-green-400/10 px-3 py-1 rounded-lg transition-colors"
          >
            <CheckCircle size={13} /> Got it
          </button>
        </div>
      )}
    </div>
  );
}
