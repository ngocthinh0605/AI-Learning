/**
 * Reading response transformers.
 * Keeps data cleanup in the API layer so UI components stay presentation-only.
 */

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatParagraphEntries(entries) {
  return entries
    .filter(([_, text]) => asText(text))
    .map(([label, text]) => `${String(label).trim()}. ${asText(text)}`)
    .join("\n\n");
}

function parseRubyHashString(rawBody) {
  const normalized = rawBody
    .replace(/=>/g, ":")
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

  const parsed = JSON.parse(normalized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
  return formatParagraphEntries(Object.entries(parsed));
}

export function normalizePassageBody(body) {
  if (!body) return "";

  if (typeof body === "object" && !Array.isArray(body)) {
    return formatParagraphEntries(Object.entries(body));
  }

  const rawBody = asText(body);
  if (!rawBody) return "";

  // Reason: some model responses contain paragraph maps serialized with Ruby hash rockets.
  // We convert that shape into readable paragraph text for the UI.
  if (rawBody.startsWith("{") && rawBody.includes("=>")) {
    try {
      const parsed = parseRubyHashString(rawBody);
      if (parsed) return parsed;
    } catch {
      // Fall through to raw text for resilience.
    }
  }

  return rawBody;
}

function deriveQuestionText(question) {
  const paragraph = asText(question?.paragraph);
  switch (question?.type) {
    case "matching_headings":
      return paragraph
        ? `Choose the best heading for paragraph ${paragraph}.`
        : "Choose the best heading for the target paragraph.";
    case "matching_information":
      return "Match each statement to the correct paragraph.";
    case "summary_completion":
      return "Complete the summary using words from the word box.";
    case "fill_blank":
      return "Complete the sentence with the correct word or phrase.";
    case "true_false_not_given":
      return "Decide if the statement is TRUE, FALSE, or NOT GIVEN.";
    case "mcq":
      return "Choose the best answer.";
    default:
      return "Answer the question based on the passage.";
  }
}

export function normalizeQuestion(question, index) {
  const normalized = { ...question };

  if (normalized.id === undefined || normalized.id === null) {
    normalized.id = index + 1;
  }

  const displayText =
    asText(normalized.question) ||
    asText(normalized.title) ||
    asText(normalized.prompt) ||
    asText(normalized.statement) ||
    asText(normalized.sentence);

  normalized.question = displayText || deriveQuestionText(normalized);

  if (!Array.isArray(normalized.options)) normalized.options = [];
  if (!Array.isArray(normalized.headings)) normalized.headings = [];
  if (!Array.isArray(normalized.paragraphs)) normalized.paragraphs = [];
  if (!Array.isArray(normalized.statements)) normalized.statements = [];
  if (!Array.isArray(normalized.word_box)) normalized.word_box = [];
  if (!Array.isArray(normalized.answers) && typeof normalized.answers !== "object") {
    normalized.answers = [];
  }

  return normalized;
}

export function normalizePassageResponse(passage) {
  if (!passage || typeof passage !== "object") return passage;

  return {
    ...passage,
    body: normalizePassageBody(passage.body),
    questions: Array.isArray(passage.questions)
      ? passage.questions.map((q, i) => normalizeQuestion(q, i))
      : [],
  };
}
