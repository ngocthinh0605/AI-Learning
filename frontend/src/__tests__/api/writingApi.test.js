import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWritingAttempts, gradeWritingEssay } from "../../api/writingApi";

const post = vi.fn();
const get = vi.fn();

vi.mock("../../api/client", () => ({
  default: { post, get },
}));

describe("writingApi", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("grades essay with expected payload", async () => {
    post.mockResolvedValue({ data: { grading: { overall_band: 6.5 } } });
    const data = await gradeWritingEssay({ taskType: "task_2", prompt: "Prompt", essay: "Essay text" });
    expect(post).toHaveBeenCalledWith("/ielts/writing/grade", {
      task_type: "task_2",
      prompt: "Prompt",
      essay: "Essay text",
    });
    expect(data.grading.overall_band).toBe(6.5);
  });

  it("fetches writing attempts by page", async () => {
    get.mockResolvedValue({ data: { attempts: [] } });
    await fetchWritingAttempts(2);
    expect(get).toHaveBeenCalledWith("/ielts/writing/attempts", { params: { page: 2 } });
  });
});
