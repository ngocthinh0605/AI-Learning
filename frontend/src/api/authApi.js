import apiClient from "./client";

/**
 * Auth API integration — all HTTP calls related to authentication.
 * Kept separate from UI/context logic per architecture rules.
 */

export async function loginUser({ email, password }) {
  const response = await apiClient.post("/auth/login", { user: { email, password } });
  // JWT is in the Authorization header
  const token = response.headers["authorization"]?.replace("Bearer ", "");
  return { user: response.data.user, token };
}

export async function registerUser({ email, password, passwordConfirmation, displayName, englishLevel }) {
  const response = await apiClient.post("/auth/register", {
    user: {
      email,
      password,
      password_confirmation: passwordConfirmation,
      display_name: displayName,
      english_level: englishLevel,
    },
  });
  const token = response.headers["authorization"]?.replace("Bearer ", "");
  return { user: response.data.user, token };
}

export async function logoutUser() {
  await apiClient.delete("/auth/logout");
}

export async function fetchProfile() {
  const response = await apiClient.get("/profile");
  return response.data;
}

export async function updateProfile({ displayName, englishLevel }) {
  const response = await apiClient.patch("/profile", {
    user: { display_name: displayName, english_level: englishLevel },
  });
  return response.data;
}
