import apiClient from "./client";

/** POST /api/v1/adaptive_content */
export async function generateAdaptiveContent({ band, questionTypes, topics }) {
  const { data } = await apiClient.post("/adaptive_content", {
    band,
    question_types: questionTypes,
    topics,
  });
  return data;
}
