import apiClient from "./client";

/**
 * Conversations API integration — all HTTP calls related to conversations and messages.
 */

export async function fetchConversations() {
  const response = await apiClient.get("/conversations");
  return response.data;
}

export async function fetchConversation(id) {
  const response = await apiClient.get(`/conversations/${id}`);
  return response.data;
}

export async function createConversation({ title, topic, difficultyLevel }) {
  const response = await apiClient.post("/conversations", {
    conversation: { title, topic, difficulty_level: difficultyLevel },
  });
  return response.data;
}

export async function deleteConversation(id) {
  await apiClient.delete(`/conversations/${id}`);
}

export async function fetchMessages(conversationId) {
  const response = await apiClient.get(`/conversations/${conversationId}/messages`);
  return response.data;
}

export async function sendTextMessage({ conversationId, content }) {
  const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
    message: { content },
  });
  return response.data;
}

/**
 * Sends an audio blob to the transcription + AI pipeline.
 * Returns { transcript, pronunciation_score, user_message, assistant_message, vocabulary_suggestion, correction }
 */
export async function sendAudioMessage({ conversationId, audioBlob }) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("conversation_id", conversationId);

  const response = await apiClient.post("/ai/transcribe_and_respond", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
