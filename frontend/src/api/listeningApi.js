import apiClient from "./client";

export async function generateListeningPassage({ difficulty, topic, accent = "mixed" }) {
  const { data } = await apiClient.post("/ielts/listening/passages", {
    difficulty,
    topic,
    accent,
  });
  return data;
}

export async function submitListeningAnswers({
  title,
  transcript,
  questions,
  answers,
  difficulty,
  topic,
}) {
  const { data } = await apiClient.post("/ielts/listening/submit", {
    title,
    transcript,
    questions,
    answers,
    difficulty,
    topic,
  });
  return data;
}

export async function fetchListeningAttempts(page = 1) {
  const { data } = await apiClient.get("/ielts/listening/attempts", { params: { page } });
  return data;
}
