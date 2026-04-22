import apiClient from "./client";

/** GET /api/v1/learning_profile */
export async function fetchLearningProfile() {
  const { data } = await apiClient.get("/learning_profile");
  return data;
}

/** POST /api/v1/session_outcomes */
export async function postSessionOutcome(sessionType, rawAnalysis) {
  const { data } = await apiClient.post("/session_outcomes", {
    session_type: sessionType,
    raw_analysis: rawAnalysis,
  });
  return data;
}
