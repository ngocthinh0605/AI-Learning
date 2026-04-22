import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ListeningPage from "../../pages/ielts/ListeningPage";

const generateListeningPassage = vi.fn();
const submitListeningAnswers = vi.fn();
const fetchListeningAttempts = vi.fn();

vi.mock("../../api/listeningApi", () => ({
  generateListeningPassage: (...args) => generateListeningPassage(...args),
  submitListeningAnswers: (...args) => submitListeningAnswers(...args),
  fetchListeningAttempts: (...args) => fetchListeningAttempts(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/ielts/listening"]}>
      <Routes>
        <Route path="/ielts/listening" element={<ListeningPage />} />
        <Route path="/ielts" element={<div>IELTS Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ListeningPage", () => {
  beforeEach(() => {
    generateListeningPassage.mockReset();
    submitListeningAnswers.mockReset();
    fetchListeningAttempts.mockReset();
    fetchListeningAttempts.mockResolvedValue({ attempts: [] });
  });

  it("runs expected flow generate then submit", async () => {
    generateListeningPassage.mockResolvedValue({
      title: "Campus Tour",
      transcript: "A student asks for directions.",
      questions: [{ id: 1, question: "Where?", answer: "A" }],
      difficulty: "band_6",
      topic: "campus",
    });
    submitListeningAnswers.mockResolvedValue({
      score: 1,
      total_questions: 1,
      feedback: { band_score: 6.0 },
    });

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /generate listening set/i }));
    await waitFor(() => expect(screen.getByText("Campus Tour")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/your answer/i), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answers/i }));

    await waitFor(() => {
      expect(submitListeningAnswers).toHaveBeenCalled();
      expect(screen.getByText(/latest result/i)).toBeInTheDocument();
    });
  });

  it("handles edge case empty history", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no attempts yet/i)).toBeInTheDocument());
  });

  it("shows failure message when generate API fails", async () => {
    generateListeningPassage.mockRejectedValue({ response: { data: { error: "Service unavailable" } } });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /generate listening set/i }));
    await waitFor(() => expect(screen.getByText(/service unavailable/i)).toBeInTheDocument());
  });

  it("shows history error with retry action", async () => {
    fetchListeningAttempts.mockRejectedValueOnce({ response: { data: { error: "History failed" } } }).mockResolvedValueOnce({ attempts: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/history failed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /retry history/i }));
    await waitFor(() => expect(fetchListeningAttempts).toHaveBeenCalledTimes(2));
  });
});
