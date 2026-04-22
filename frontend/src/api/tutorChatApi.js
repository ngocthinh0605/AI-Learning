import apiClient from "./client";

/** POST /api/v1/tutor_chat — structured JSON reply (reply_text + structured) */
export async function postTutorChat({ message, messages = [], learningProfile = null }) {
  const payload = { message, messages };
  if (learningProfile != null) payload.learning_profile = learningProfile;
  const { data } = await apiClient.post("/tutor_chat", payload);
  return data;
}
