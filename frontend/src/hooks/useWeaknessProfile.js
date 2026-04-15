import { useState, useEffect, useCallback } from "react";
import { fetchWeaknessProfile } from "../api/readingApi";

/**
 * Fetches and caches the current user's IELTS weakness profile.
 * Re-fetches when `refresh()` is called (e.g. after a new attempt).
 */
export function useWeaknessProfile() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeaknessProfile();
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load weakness profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { profile, loading, error, refresh: load };
}
