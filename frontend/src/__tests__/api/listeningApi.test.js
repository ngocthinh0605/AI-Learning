import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchListeningAttempts, generateListeningPassage, submitListeningAnswers } from "../../api/listeningApi";

const post = vi.fn();
const get = vi.fn();

vi.mock("../../api/client", () => ({
  default: { post, get },
}));

describe("listeningApi", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("generates listening passage", async () => {
    post.mockResolvedValue({ data: { id: "p1" } });
    const data = await generateListeningPassage({ difficulty: "band_6", topic: "travel" });
    expect(post).toHaveBeenCalledWith("/ielts/listening/passages", {
      difficulty: "band_6",
      topic: "travel",
      accent: "mixed",
    });
    expect(data.id).toBe("p1");
  });

  it("submits answers payload", async () => {
    post.mockResolvedValue({ data: { id: "a1" } });
    await submitListeningAnswers({
      title: "L1",
      transcript: "hello",
      questions: [{ id: 1, answer: "A" }],
      answers: { "1": "A" },
      difficulty: "band_6",
      topic: "travel",
    });
    expect(post).toHaveBeenCalledWith("/ielts/listening/submit", expect.objectContaining({ title: "L1" }));
  });

  it("fetches attempts page", async () => {
    get.mockResolvedValue({ data: { attempts: [] } });
    await fetchListeningAttempts(2);
    expect(get).toHaveBeenCalledWith("/ielts/listening/attempts", { params: { page: 2 } });
  });
});
