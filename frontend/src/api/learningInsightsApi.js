import apiClient from "./client";

/** POST /api/v1/learning_insights — optional learning_data override */
export async function postLearningInsights(learningData = null) {
  const payload = learningData ? { learning_data: learningData } : {};
  const { data } = await apiClient.post("/learning_insights", payload);
  return data;
}
