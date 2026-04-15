import { create } from "zustand";
import { loginUser, registerUser, logoutUser, fetchProfile } from "../api/authApi";
import { disconnectConsumer } from "../api/cableApi";

/**
 * Global auth store — replaces AuthContext.
 *
 * Exposes:
 *   user        - authenticated user object or null
 *   loading     - true while the initial session restore is in progress
 *   login()     - authenticate with email/password
 *   register()  - create account
 *   logout()    - sign out, clear token, close WebSocket
 *   refreshUser() - re-fetch profile (e.g. after XP/streak update)
 *   init()      - restore session from localStorage on app boot
 */
export const useAuthStore = create((set) => ({
  user:    null,
  loading: true,

  /**
   * Called once on app mount (in main.jsx) to restore an existing session.
   * Reads the JWT from localStorage and fetches the user profile.
   */
  init: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await fetchProfile();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem("auth_token");
      set({ loading: false });
    }
  },

  login: async (credentials) => {
    const { user, token } = await loginUser(credentials);
    localStorage.setItem("auth_token", token);
    set({ user });
    return user;
  },

  register: async (data) => {
    const { user, token } = await registerUser(data);
    localStorage.setItem("auth_token", token);
    set({ user });
    return user;
  },

  logout: async () => {
    try {
      await logoutUser();
    } finally {
      // Close WebSocket before clearing token so the backend sees a clean disconnect
      disconnectConsumer();
      localStorage.removeItem("auth_token");
      set({ user: null });
    }
  },

  refreshUser: async () => {
    const user = await fetchProfile();
    set({ user });
    return user;
  },
}));
