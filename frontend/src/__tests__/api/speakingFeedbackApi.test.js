import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSpeakingAttempts, postSpeakingFeedback } from "../../api/speakingFeedbackApi";

const post = vi.fn();
const get = vi.fn();

vi.mock("../../api/client", () => ({
  default: { post, get },
}));

describe("speakingFeedbackApi", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("posts sentence and update_profile flag", async () => {
    post.mockResolvedValue({ data: { scores: { fluency: 6.5 } } });
    const data = await postSpeakingFeedback("I go to school every day.", { updateProfile: true });

    expect(post).toHaveBeenCalledWith("/speaking_feedback", {
      sentence: "I go to school every day.",
      update_profile: true,
      part: undefined,
      prompt: undefined,
    });
    expect(data.scores.fluency).toBe(6.5);
  });

  it("defaults update_profile to false", async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await postSpeakingFeedback("Hello world");

    expect(post).toHaveBeenCalledWith("/speaking_feedback", {
      sentence: "Hello world",
      update_profile: false,
      part: undefined,
      prompt: undefined,
    });
  });

  it("fetches speaking attempts with pagination", async () => {
    get.mockResolvedValue({ data: { attempts: [{ id: "a1" }], meta: { page: 2 } } });
    const data = await fetchSpeakingAttempts({ page: 2, perPage: 5 });
    expect(get).toHaveBeenCalledWith("/speaking_attempts", { params: { page: 2, per_page: 5 } });
    expect(data.attempts[0].id).toBe("a1");
  });

  it("includes optional part filter", async () => {
    get.mockResolvedValue({ data: { attempts: [] } });
    await fetchSpeakingAttempts({ page: 1, perPage: 10, part: "part2" });
    expect(get).toHaveBeenCalledWith("/speaking_attempts", {
      params: { page: 1, per_page: 10, part: "part2" },
    });
  });
});
