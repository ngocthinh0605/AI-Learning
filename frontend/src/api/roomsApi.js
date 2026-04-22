import apiClient from "./client";

export async function fetchRooms() {
  const { data } = await apiClient.get("/rooms");
  return data;
}

export async function createRoom({ name, description }) {
  const { data } = await apiClient.post("/rooms", { room: { name, description } });
  return data;
}

export async function joinRoom(roomId) {
  const { data } = await apiClient.post(`/rooms/${roomId}/join`);
  return data;
}

export async function leaveRoom(roomId) {
  const { data } = await apiClient.delete(`/rooms/${roomId}/leave`);
  return data;
}

export async function fetchRoom(roomId) {
  const { data } = await apiClient.get(`/rooms/${roomId}`);
  return data;
}

export async function sendRoomMessage({ roomId, content }) {
  const { data } = await apiClient.post(`/rooms/${roomId}/messages`, { message: { content } });
  return data;
}

export async function deleteRoomMessage({ roomId, messageId }) {
  const { data } = await apiClient.delete(`/rooms/${roomId}/messages/${messageId}`);
  return data;
}

export async function removeRoomMember({ roomId, userId }) {
  const { data } = await apiClient.delete(`/rooms/${roomId}/members/${userId}`);
  return data;
}
