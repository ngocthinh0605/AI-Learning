import { apiGet } from "./client";

export function fetchProfile(token: string) {
  return apiGet("/profile", token);
}

export function fetchLearningProgress(token: string) {
  return apiGet("/learning_progress", token);
}
