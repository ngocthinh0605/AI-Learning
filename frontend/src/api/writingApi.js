import apiClient from "./client";

export async function gradeWritingEssay({ taskType = "task_2", prompt, essay }) {
  const { data } = await apiClient.post("/ielts/writing/grade", {
    task_type: taskType,
    prompt,
    essay,
  });
  return data;
}

export async function fetchWritingAttempts(page = 1) {
  const { data } = await apiClient.get("/ielts/writing/attempts", { params: { page } });
  return data;
}
