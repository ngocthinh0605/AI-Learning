import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReadingSession } from "../../hooks/useReadingSession";

// Mock the API module so tests don't hit the network
vi.mock("../../api/readingApi", () => ({
  generatePassage: vi.fn(),
  submitAnswers:   vi.fn(),
}));

import { generatePassage, submitAnswers } from "../../api/readingApi";

const MOCK_PASSAGE = {
  id:           "p1",
  title:        "Test Passage",
  body:         "Some text here.",
  difficulty:   "band_6",
  passage_type: "academic",
  questions: [
    { id: 1, type: "mcq", question: "Q1?", options: ["A. X", "B. Y"], answer: "A" },
    { id: 2, type: "true_false_not_given", statement: "S2.", answer: "TRUE" },
  ],
};

const MOCK_ATTEMPT = {
  id:              "a1",
  score:           2,
  total_questions: 2,
  band_score:      6.0,
  feedback: {
    band_score: 6.0,
    tips:       "Good job.",
    questions: [
      { id: 1, is_correct: true,  explanation: "Correct!" },
      { id: 2, is_correct: true,  explanation: "Correct!" },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  generatePassage.mockResolvedValue(MOCK_PASSAGE);
  submitAnswers.mockResolvedValue(MOCK_ATTEMPT);
});

describe("useReadingSession", () => {
  describe("initial state", () => {
    it("starts with no passage, no answers, no attempt", () => {
      const { result } = renderHook(() => useReadingSession());
      expect(result.current.passage).toBeNull();
      expect(result.current.answers).toEqual({});
      expect(result.current.attempt).toBeNull();
      expect(result.current.generating).toBe(false);
      expect(result.current.submitting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("reports 0 answered and 0 total before a passage is loaded", () => {
      const { result } = renderHook(() => useReadingSession());
      expect(result.current.answeredCount).toBe(0);
      expect(result.current.totalQuestions).toBe(0);
      expect(result.current.allAnswered).toBe(false);
    });
  });

  describe("generate", () => {
    it("sets passage after successful generation", async () => {
      const { result } = renderHook(() => useReadingSession());

      await act(async () => {
        await result.current.generate({ difficulty: "band_6" });
      });

      expect(result.current.passage).toEqual(MOCK_PASSAGE);
      expect(result.current.generating).toBe(false);
      expect(result.current.totalQuestions).toBe(2);
    });

    it("sets error when generation fails", async () => {
      generatePassage.mockRejectedValueOnce({
        response: { data: { error: "Ollama unavailable" } },
      });

      const { result } = renderHook(() => useReadingSession());
      await act(async () => {
        await result.current.generate({ difficulty: "band_6" });
      });

      expect(result.current.passage).toBeNull();
      expect(result.current.error).toBe("Ollama unavailable");
    });
  });

  describe("setAnswer", () => {
    it("records an answer for a question id", async () => {
      const { result } = renderHook(() => useReadingSession());
      await act(async () => { await result.current.generate({ difficulty: "band_6" }); });

      act(() => { result.current.setAnswer(1, "A"); });
      expect(result.current.answers["1"]).toBe("A");
    });

    it("tracks allAnswered correctly", async () => {
      const { result } = renderHook(() => useReadingSession());
      await act(async () => { await result.current.generate({ difficulty: "band_6" }); });

      act(() => { result.current.setAnswer(1, "A"); });
      expect(result.current.allAnswered).toBe(false);

      act(() => { result.current.setAnswer(2, "TRUE"); });
      expect(result.current.allAnswered).toBe(true);
    });
  });

  describe("handleSubmit", () => {
    it("sets attempt after successful submission", async () => {
      const { result } = renderHook(() => useReadingSession());
      await act(async () => { await result.current.generate({ difficulty: "band_6" }); });
      act(() => { result.current.setAnswer(1, "A"); result.current.setAnswer(2, "TRUE"); });

      await act(async () => { await result.current.handleSubmit(); });

      expect(result.current.attempt).toEqual(MOCK_ATTEMPT);
      expect(result.current.submitting).toBe(false);
    });

    it("does nothing when no passage is loaded", async () => {
      const { result } = renderHook(() => useReadingSession());
      await act(async () => { await result.current.handleSubmit(); });
      expect(submitAnswers).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears all state back to initial values", async () => {
      const { result } = renderHook(() => useReadingSession());
      await act(async () => { await result.current.generate({ difficulty: "band_6" }); });
      act(() => { result.current.setAnswer(1, "A"); });

      act(() => { result.current.reset(); });

      expect(result.current.passage).toBeNull();
      expect(result.current.answers).toEqual({});
      expect(result.current.attempt).toBeNull();
    });
  });

  describe("formattedTime", () => {
    it("formats time as mm:ss", () => {
      const { result } = renderHook(() =>
        useReadingSession({ timedMode: false, timeLimitSeconds: 125 })
      );
      expect(result.current.formattedTime).toBe("02:05");
    });
  });
});
