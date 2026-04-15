import React, { useMemo } from "react";

/**
 * Wraps a passage body string and highlights any occurrence of `phrase`
 * with a <mark> element so users can see where the answer is located.
 *
 * Props:
 *   body   {string} - full passage text
 *   phrase {string} - verbatim phrase from location_in_passage
 */
export default function AnswerHighlight({ body, phrase }) {
  const parts = useMemo(() => {
    if (!phrase || !body) return [{ text: body || "", highlight: false }];

    // Escape special regex characters in the phrase
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex   = new RegExp(`(${escaped})`, "gi");
    const split   = body.split(regex);

    return split.map((part) => ({
      text:      part,
      highlight: regex.test(part),
    }));
  }, [body, phrase]);

  return (
    <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="bg-accent-500/30 text-accent-200 rounded px-0.5 not-prose"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </div>
  );
}
