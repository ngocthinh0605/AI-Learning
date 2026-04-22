import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDailyLearningPlanHistory, postDailyLearningPlan } from "../../api/dailyLearningPlanApi";

const post = vi.fn();
const get = vi.fn();
vi.mock("../../api/client", () => ({ default: { post, get } }));

describe("dailyLearningPlanApi", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("posts planner payload to backend", async () => {
    post.mockResolvedValue({ data: { tasks: [] } });
    await postDailyLearningPlan({
      learningProfileJson: { level: "B1" },
      recentPerformanceJson: { reading: 0.4 },
      learningGoalJson: { band: 7 },
      dailyTimeMinutes: 30,
    });
    expect(post).toHaveBeenCalledWith("/daily_learning_plan", {
      learning_profile_json: { level: "B1" },
      recent_performance_json: { reading: 0.4 },
      learning_goal_json: { band: 7 },
      daily_time_minutes: 30,
    });
  });

  it("fetches daily plan history", async () => {
    get.mockResolvedValue({ data: { attempts: [] } });
    await fetchDailyLearningPlanHistory(2);
    expect(get).toHaveBeenCalledWith("/daily_learning_plan", { params: { page: 2 } });
  });
});
