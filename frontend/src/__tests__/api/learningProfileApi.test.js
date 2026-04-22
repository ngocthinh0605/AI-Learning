import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLearningProfile, postSessionOutcome } from "../../api/learningProfileApi";

const get = vi.fn();
const post = vi.fn();

vi.mock("../../api/client", () => ({
  default: { get, post },
}));

describe("learningProfileApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("fetches learning profile", async () => {
    get.mockResolvedValue({ data: { profile_version: 2 } });
    const data = await fetchLearningProfile();
    expect(get).toHaveBeenCalledWith("/learning_profile");
    expect(data.profile_version).toBe(2);
  });

  it("posts session outcome", async () => {
    post.mockResolvedValue({ data: { id: "x" } });
    const data = await postSessionOutcome("speaking", { ielts: { estimated_band: 7 } });
    expect(post).toHaveBeenCalledWith("/session_outcomes", {
      session_type: "speaking",
      raw_analysis: { ielts: { estimated_band: 7 } },
    });
    expect(data.id).toBe("x");
  });
});
