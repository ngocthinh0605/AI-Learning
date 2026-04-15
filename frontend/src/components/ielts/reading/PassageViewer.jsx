import React, { useState, useCallback, useMemo } from "react";
import { BookmarkPlus } from "lucide-react";
import { saveVocabularyWord } from "../../../api/vocabularyApi";
import toast from "react-hot-toast";

/**
 * Renders the passage body text.
 * - When the user selects (highlights) a word or phrase, a "Save to Vocabulary"
 *   tooltip appears so they can add it directly to their word list.
 * - When `highlightPhrase` is provided, wraps matching text in <mark> so the
 *   answer location is visually indicated (Review Mode / answer reveal).
 *
 * Props:
 *   passage         {Object}  - passage object
 *   highlightPhrase {string}  - optional verbatim phrase to highlight in the body
 */
export default function PassageViewer({ passage, highlightPhrase }) {
  const [tooltip, setTooltip] = useState(null); // { text, x, y }
  const [saving,  setSaving]  = useState(false);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selected  = selection?.toString().trim();

    if (!selected || selected.length < 2 || selected.length > 60) {
      setTooltip(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect  = range.getBoundingClientRect();

    setTooltip({
      text: selected,
      x:    rect.left + rect.width / 2,
      y:    rect.top - 10,
    });
  }, []);

  const handleSaveVocab = useCallback(async () => {
    if (!tooltip || saving) return;
    setSaving(true);
    try {
      await saveVocabularyWord({ word: tooltip.text });
      toast.success(`"${tooltip.text}" saved to vocabulary`);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || "Could not save word";
      toast.error(msg);
    } finally {
      setSaving(false);
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [tooltip, saving]);

  const dismissTooltip = useCallback(() => setTooltip(null), []);

  // Build highlighted body segments when highlightPhrase is provided.
  // Reason: we split the body string on the phrase so we can wrap matches in <mark>
  // without using dangerouslySetInnerHTML.
  const bodySegments = useMemo(() => {
    if (!highlightPhrase || !passage?.body) return null;
    const escaped = highlightPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = new RegExp(`(${escaped})`, "gi");
    return passage.body.split(regex).map((part, i) => ({
      text:      part,
      highlight: regex.test(part),
    }));
  }, [passage?.body, highlightPhrase]);

  if (!passage) return null;

  return (
    <div className="relative">
      {/* Passage header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{passage.title}</h2>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 font-medium capitalize">
            {passage.passage_type}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 font-medium">
            {passage.difficulty?.replace("_", " ").toUpperCase()}
          </span>
          {passage.topic && (
            <span className="text-xs text-gray-500 capitalize">{passage.topic}</span>
          )}
        </div>
      </div>

      {/* Passage body — user can highlight to save vocabulary */}
      <div
        className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed select-text"
        onMouseUp={handleMouseUp}
        onClick={dismissTooltip}
      >
        {bodySegments
          ? /* Render with answer-location highlighting */
            bodySegments.map((seg, i) =>
              seg.highlight ? (
                <mark
                  key={i}
                  className="bg-yellow-400/25 text-yellow-200 rounded px-0.5 not-prose"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )
          : /* Normal rendering — split on newlines for paragraphs */
            passage.body.split("\n").map((para, i) =>
              para.trim() ? <p key={i}>{para}</p> : <br key={i} />
            )
        }
      </div>

      {/* Highlight-to-save tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <button
            onClick={handleSaveVocab}
            disabled={saving}
            className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg transition-colors disabled:opacity-60"
          >
            <BookmarkPlus size={13} />
            {saving ? "Saving…" : `Save "${tooltip.text}"`}
          </button>
          {/* Arrow */}
          <div className="w-2 h-2 bg-accent-500 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
