import { describe, it, expect } from "vitest";
import {
  generatePassage,
  submitAnswers,
  fetchAttempts,
  fetchAttempt,
  fetchAttemptReview,
  fetchWeaknessProfile,
  fetchTrainingExercises,
} from "../../api/readingApi";

describe("readingApi", () => {
  describe("generatePassage", () => {
    it("returns a passage with title, body and questions", async () => {
      const passage = await generatePassage({ difficulty: "band_6", passageType: "academic" });
      expect(passage).toHaveProperty("id");
      expect(passage).toHaveProperty("title");
      expect(passage).toHaveProperty("body");
      expect(Array.isArray(passage.questions)).toBe(true);
    });

    it("includes the requested difficulty in the response", async () => {
      const passage = await generatePassage({ difficulty: "band_6" });
      expect(passage.difficulty).toBe("band_6");
    });
  });

  describe("submitAnswers", () => {
    it("returns an attempt with score and band_score", async () => {
      const attempt = await submitAnswers({
        passageId:        "p1",
        answers:          { "1": "C", "2": "TRUE" },
        timeTakenSeconds: 300,
      });
      expect(attempt).toHaveProperty("id");
      expect(attempt).toHaveProperty("score");
      expect(attempt).toHaveProperty("band_score");
    });

    it("includes feedback with questions array", async () => {
      const attempt = await submitAnswers({ passageId: "p1", answers: { "1": "C" } });
      expect(attempt.feedback).toHaveProperty("questions");
      expect(Array.isArray(attempt.feedback.questions)).toBe(true);
    });
  });

  describe("fetchAttempts", () => {
    it("returns attempts array and meta pagination info", async () => {
      const data = await fetchAttempts();
      expect(Array.isArray(data.attempts)).toBe(true);
      expect(data.meta).toHaveProperty("total");
      expect(data.meta).toHaveProperty("page");
    });

    it("returns attempts with band_score", async () => {
      const data = await fetchAttempts(1);
      expect(data.attempts[0]).toHaveProperty("band_score");
    });
  });

  describe("fetchAttempt", () => {
    it("returns a single attempt by id", async () => {
      const attempt = await fetchAttempt("a1");
      expect(attempt.id).toBe("a1");
      expect(attempt).toHaveProperty("score");
    });
  });

  describe("fetchAttemptReview", () => {
    it("returns attempt, wrong_answers, and similar_questions", async () => {
      const data = await fetchAttemptReview("a1");
      expect(data).toHaveProperty("attempt");
      expect(data).toHaveProperty("wrong_answers");
      expect(data).toHaveProperty("similar_questions");
      expect(Array.isArray(data.wrong_answers)).toBe(true);
    });

    it("includes error_type in wrong answers", async () => {
      const data = await fetchAttemptReview("a1");
      expect(data.wrong_answers[0]).toHaveProperty("error_type");
    });
  });

  describe("fetchWeaknessProfile", () => {
    it("returns weakness profile with weakness_by_type", async () => {
      const profile = await fetchWeaknessProfile();
      expect(profile).toHaveProperty("weakness_by_type");
      expect(profile).toHaveProperty("recommended_difficulty");
    });

    it("returns total_attempts count", async () => {
      const profile = await fetchWeaknessProfile();
      expect(typeof profile.total_attempts).toBe("number");
    });
  });

  describe("fetchTrainingExercises", () => {
    it("returns weakness_type and exercises array", async () => {
      const data = await fetchTrainingExercises({ count: 1 });
      expect(data).toHaveProperty("weakness_type");
      expect(Array.isArray(data.exercises)).toBe(true);
    });

    it("exercises include type, prompt, options, and answer", async () => {
      const data = await fetchTrainingExercises();
      const ex   = data.exercises[0];
      expect(ex).toHaveProperty("type");
      expect(ex).toHaveProperty("prompt");
      expect(ex).toHaveProperty("options");
      expect(ex).toHaveProperty("answer");
    });
  });
});
