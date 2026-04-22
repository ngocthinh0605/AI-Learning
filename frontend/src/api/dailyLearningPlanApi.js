import apiClient from "./client";

export async function postDailyLearningPlan({
  learningProfileJson,
  recentPerformanceJson,
  learningGoalJson,
  dailyTimeMinutes,
}) {
  const { data } = await apiClient.post("/daily_learning_plan", {
    learning_profile_json: learningProfileJson,
    recent_performance_json: recentPerformanceJson,
    learning_goal_json: learningGoalJson,
    daily_time_minutes: dailyTimeMinutes,
  });
  return data;
}

export async function fetchDailyLearningPlanHistory(page = 1) {
  const { data } = await apiClient.get("/daily_learning_plan", { params: { page } });
  return data;
}
