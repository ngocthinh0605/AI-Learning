import apiClient from "./client";

/** POST /api/v1/speaking_feedback */
export async function postSpeakingFeedback(sentence, { updateProfile = false, part, prompt } = {}) {
  const { data } = await apiClient.post("/speaking_feedback", {
    sentence,
    update_profile: updateProfile,
    part,
    prompt,
  });
  return data;
}

/** GET /api/v1/speaking_attempts */
export async function fetchSpeakingAttempts({ page = 1, perPage = 10, part } = {}) {
  const params = { page, per_page: perPage };
  if (part) params.part = part;
  const { data } = await apiClient.get("/speaking_attempts", { params });
  return data;
}
