import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLearningProgress } from "../../api/learningProgressApi";

const get = vi.fn();

vi.mock("../../api/client", () => ({
  default: { get },
}));

describe("learningProgressApi", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("fetches unified learning progress", async () => {
    get.mockResolvedValue({ data: { skill_counts: { reading: 2 } } });
    const data = await fetchLearningProgress();
    expect(get).toHaveBeenCalledWith("/learning_progress");
    expect(data.skill_counts.reading).toBe(2);
  });
});
