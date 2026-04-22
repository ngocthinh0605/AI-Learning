import apiClient from "./client";

export async function fetchLearningProgress() {
  const { data } = await apiClient.get("/learning_progress");
  return data;
}
