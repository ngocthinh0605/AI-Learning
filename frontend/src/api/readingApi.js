import apiClient from "./client";
import { normalizePassageResponse } from "./readingTransforms";

/**
 * IELTS Reading API integration — all HTTP calls, no UI logic.
 */

/**
 * Generates a new IELTS reading passage via AI.
 * @param {Object} params
 * @param {string} params.difficulty   - "band_5" | "band_6" | "band_7" | "band_8"
 * @param {string} [params.topic]      - Optional topic hint
 * @param {string} [params.passageType] - "academic" | "general"
 * @returns {Promise<Object>} passage object with title, body, questions, etc.
 */
export async function generatePassage({ difficulty, topic, passageType = "academic" }) {
  const response = await apiClient.post("/ielts/reading/passages", {
    difficulty,
    topic,
    passage_type: passageType,
  });
  return normalizePassageResponse(response.data);
}

/**
 * Submits answers for a passage and returns an attempt with AI feedback.
 * @param {string} passageId
 * @param {Object} answers           - { "1": "A", "2": "TRUE", ... }
 * @param {number} [timeTakenSeconds]
 * @returns {Promise<Object>} attempt object with score, band_score, feedback
 */
export async function submitAnswers({ passageId, answers, timeTakenSeconds }) {
  const response = await apiClient.post(`/ielts/reading/passages/${passageId}/submit`, {
    answers,
    time_taken_seconds: timeTakenSeconds,
  });
  return response.data;
}

/**
 * Fetches the current user's completed reading attempts (paginated).
 * @param {number} [page=1]
 * @returns {Promise<{ attempts: Array, meta: Object }>}
 */
export async function fetchAttempts(page = 1) {
  const response = await apiClient.get("/ielts/reading/attempts", { params: { page } });
  return response.data;
}

/**
 * Fetches a single attempt by ID.
 * @param {string} attemptId
 * @returns {Promise<Object>} attempt object
 */
export async function fetchAttempt(attemptId) {
  const response = await apiClient.get(`/ielts/reading/attempts/${attemptId}`);
  return response.data;
}

/**
 * Fetches the Review Mode data for an attempt:
 * wrong answers, AI explanations, and similar generated questions.
 * @param {string} attemptId
 * @returns {Promise<{ attempt, wrong_answers, similar_questions }>}
 */
export async function fetchAttemptReview(attemptId) {
  const response = await apiClient.get(`/ielts/reading/attempts/${attemptId}/review`);
  return response.data;
}

/**
 * Fetches the current user's weakness profile.
 * @returns {Promise<Object>} weakness profile with weakness_by_type, recommended_difficulty, etc.
 */
export async function fetchWeaknessProfile() {
  const response = await apiClient.get("/ielts/reading/weakness");
  return response.data;
}

/**
 * Fetches AI-generated training micro-exercises based on the user's weakest skill.
 * @param {Object} [params]
 * @param {number} [params.count=3] - number of exercises to generate
 * @returns {Promise<{ weakness_type: string, exercises: Array }>}
 */
export async function fetchTrainingExercises({ count = 3 } = {}) {
  const response = await apiClient.get("/ielts/reading/training", { params: { count } });
  return response.data;
}
