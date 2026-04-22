import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SpeakingPage from "../../pages/ielts/SpeakingPage";

const postSpeakingFeedback = vi.fn();
const fetchSpeakingAttempts = vi.fn();

vi.mock("../../api/speakingFeedbackApi", () => ({
  postSpeakingFeedback: (...args) => postSpeakingFeedback(...args),
  fetchSpeakingAttempts: (...args) => fetchSpeakingAttempts(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/ielts/speaking"]}>
      <Routes>
        <Route path="/ielts/speaking" element={<SpeakingPage />} />
        <Route path="/ielts" element={<div>IELTS Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SpeakingPage", () => {
  beforeEach(() => {
    postSpeakingFeedback.mockReset();
    fetchSpeakingAttempts.mockReset();
    fetchSpeakingAttempts.mockResolvedValue({ attempts: [] });
  });

  it("submits transcript and shows score breakdown", async () => {
    fetchSpeakingAttempts
      .mockResolvedValueOnce({ attempts: [], meta: { page: 1, total_pages: 1 } })
      .mockResolvedValueOnce({
        attempts: [
          {
            id: "attempt-1",
            part: "part1",
            sentence: "I goes to school every day.",
            created_at: "2026-04-22T00:00:00.000Z",
            result: {
              corrected_sentence: "I go to school every day.",
              scores: { fluency: 6.5, grammar: 6.0, pronunciation: 6.5 },
            },
          },
        ],
        meta: { page: 1, total_pages: 1 },
      });
    postSpeakingFeedback.mockResolvedValue({
      corrected_sentence: "I go to school every day.",
      scores: { fluency: 6.5, grammar: 6.0, pronunciation: 6.5 },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/transcript/i), { target: { value: "I goes to school every day." } });
    fireEvent.click(screen.getByRole("button", { name: /evaluate speaking/i }));

    await waitFor(() => {
      expect(postSpeakingFeedback).toHaveBeenCalled();
      expect(fetchSpeakingAttempts).toHaveBeenCalledTimes(2);
      expect(fetchSpeakingAttempts).toHaveBeenNthCalledWith(1, { page: 1, perPage: 10, part: undefined });
      expect(screen.getByText("Attempt Review")).toBeInTheDocument();
      expect(screen.getByText("6.5")).toBeInTheDocument();
    });
  });

  it("shows edge validation when transcript is blank", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /evaluate speaking/i }));
    expect(screen.getByText(/please enter your speaking transcript first/i)).toBeInTheDocument();
    expect(postSpeakingFeedback).not.toHaveBeenCalled();
  });

  it("shows failure message when API rejects", async () => {
    postSpeakingFeedback.mockRejectedValue({
      response: { data: { error: "LLM unavailable" } },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/transcript/i), { target: { value: "I like reading books." } });
    fireEvent.click(screen.getByRole("button", { name: /evaluate speaking/i }));

    await waitFor(() => {
      expect(screen.getByText(/llm unavailable/i)).toBeInTheDocument();
    });
  });

  it("loads more attempts when clicking Load more", async () => {
    fetchSpeakingAttempts
      .mockResolvedValueOnce({
        attempts: [{ id: "a1", part: "part1", sentence: "First", created_at: "2026-04-22T00:00:00.000Z", result: {} }],
        meta: { page: 1, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        attempts: [{ id: "a2", part: "part2", sentence: "Second", created_at: "2026-04-23T00:00:00.000Z", result: {} }],
        meta: { page: 2, total_pages: 2 },
      });

    renderPage();
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(fetchSpeakingAttempts).toHaveBeenNthCalledWith(2, { page: 2, perPage: 10, part: undefined });
      expect(screen.getByText("Second")).toBeInTheDocument();
    });
  });
});
