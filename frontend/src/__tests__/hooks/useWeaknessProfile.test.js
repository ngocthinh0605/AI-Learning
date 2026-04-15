import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWeaknessProfile } from "../../hooks/useWeaknessProfile";

vi.mock("../../api/readingApi", () => ({
  fetchWeaknessProfile: vi.fn(),
}));

import { fetchWeaknessProfile } from "../../api/readingApi";

const MOCK_PROFILE = {
  id:                    "wp-1",
  weakness_by_type:      { mcq: { attempts: 10, correct: 7, rate: 0.7 } },
  error_type_counts:     { paraphrase: 2 },
  recommended_difficulty: "band_7",
  total_attempts:        5,
  weakest_type:          "mcq",
};

describe("useWeaknessProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns profile data on success", async () => {
    fetchWeaknessProfile.mockResolvedValueOnce(MOCK_PROFILE);

    const { result } = renderHook(() => useWeaknessProfile());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual(MOCK_PROFILE);
    expect(result.current.error).toBeNull();
  });

  it("sets error when API call fails", async () => {
    fetchWeaknessProfile.mockRejectedValueOnce({
      response: { data: { error: "Not found" } },
    });

    const { result } = renderHook(() => useWeaknessProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBe("Not found");
  });

  it("exposes a refresh function that re-fetches the profile", async () => {
    fetchWeaknessProfile
      .mockResolvedValueOnce(MOCK_PROFILE)
      .mockResolvedValueOnce({ ...MOCK_PROFILE, total_attempts: 6 });

    const { result } = renderHook(() => useWeaknessProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile.total_attempts).toBe(5);

    result.current.refresh();
    await waitFor(() => expect(result.current.profile.total_attempts).toBe(6));

    expect(fetchWeaknessProfile).toHaveBeenCalledTimes(2);
  });
});
