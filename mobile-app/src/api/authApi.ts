import { apiPost } from "./client";

export function login(email: string, password: string) {
  return apiPost("/auth/login", { user: { email, password } });
}

export function register(email: string, password: string, displayName?: string) {
  return apiPost("/auth/register", { user: { email, password, display_name: displayName } });
}
