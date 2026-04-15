import apiClient from "./client";

/**
 * Vocabulary API integration — all HTTP calls for the vocabulary / SRS system.
 */

export async function fetchVocabularyWords({ dueForReview = false } = {}) {
  const params = dueForReview ? { due_for_review: true } : {};
  const response = await apiClient.get("/vocabulary_words", { params });
  return response.data;
}

/**
 * Fetches a review-ordered batch of due words for a study session.
 * Returns { words: [...], due_total: number }
 */
export async function fetchReviewSession({ limit = 20 } = {}) {
  const response = await apiClient.get("/vocabulary_words/session", { params: { limit } });
  return response.data;
}

export async function saveVocabularyWord({ word, definition, contextSentence }) {
  const response = await apiClient.post("/vocabulary_words", {
    vocabulary_word: { word, definition, context_sentence: contextSentence },
  });
  return response.data;
}

/**
 * Reviews a word using the SM-2 quality rating (0–5).
 *   quality 0-2 = failed recall  → interval resets
 *   quality 3-5 = successful     → interval grows
 */
export async function reviewVocabularyWord({ id, quality }) {
  const response = await apiClient.patch(`/vocabulary_words/${id}`, { quality });
  return response.data;
}

/**
 * Legacy binary review — kept so VocabCard Hard/Got it still works.
 */
export async function reviewVocabularyWordBinary({ id, result }) {
  const response = await apiClient.patch(`/vocabulary_words/${id}`, {
    review_result: result,
  });
  return response.data;
}

export async function deleteVocabularyWord(id) {
  await apiClient.delete(`/vocabulary_words/${id}`);
}

/** Manually set the word type for a vocabulary word. */
export async function updateVocabularyWordType(id, wordType) {
  const response = await apiClient.patch(`/vocabulary_words/${id}`, {
    vocabulary_word: { word_type: wordType },
  });
  return response.data;
}

/**
 * Asks the AI to generate word_type, pronunciation (IPA), and a fresh example
 * sentence for the given vocabulary word ID.
 */
export async function enrichVocabularyWord(id) {
  const response = await apiClient.post(`/vocabulary_words/${id}/enrich`);
  return response.data;
}
