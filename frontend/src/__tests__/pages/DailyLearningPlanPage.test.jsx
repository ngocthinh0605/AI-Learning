import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DailyLearningPlanPage from "../../pages/DailyLearningPlanPage";

const postDailyLearningPlan = vi.fn();
const fetchDailyLearningPlanHistory = vi.fn();
vi.mock("../../api/dailyLearningPlanApi", () => ({
  postDailyLearningPlan: (...args) => postDailyLearningPlan(...args),
  fetchDailyLearningPlanHistory: (...args) => fetchDailyLearningPlanHistory(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/daily-plan"]}>
      <Routes>
        <Route path="/daily-plan" element={<DailyLearningPlanPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DailyLearningPlanPage", () => {
  beforeEach(() => {
    postDailyLearningPlan.mockReset();
    fetchDailyLearningPlanHistory.mockReset();
    fetchDailyLearningPlanHistory.mockResolvedValue({ attempts: [] });
  });

  it("renders generated plan summary and tasks", async () => {
    postDailyLearningPlan.mockResolvedValue({
      summary: { main_focus: "inference", reason: "declining" },
      tasks: [
        { type: "inference_training", focus: "not given", duration_minutes: 15, reason: "weak" },
        { type: "vocab_training", focus: "paraphrase", duration_minutes: 6, reason: "cross-skill support" },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /generate daily plan/i }));
    await waitFor(() => {
      expect(screen.getByText(/plan summary/i)).toBeInTheDocument();
      expect(screen.getByText(/inference practice/i)).toBeInTheDocument();
      expect(screen.getByText(/cross-skill mix/i)).toBeInTheDocument();
    });
  });

  it("shows edge error for missing required fields", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/exam date/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /generate daily plan/i }));
    expect(screen.getByText(/please complete all required fields/i)).toBeInTheDocument();
  });

  it("shows API failure message", async () => {
    postDailyLearningPlan
      .mockRejectedValueOnce({ response: { data: { error: "invalid output" } } })
      .mockResolvedValueOnce({
        summary: { main_focus: "reading", reason: "weak" },
        tasks: [{ type: "reading_training", focus: "inference", duration_minutes: 15, reason: "r" }, { type: "vocab_training", focus: "synonyms", duration_minutes: 5, reason: "support" }],
      });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /generate daily plan/i }));
    await waitFor(() => expect(screen.getByText(/invalid output/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /retry last request/i }));
    await waitFor(() => expect(screen.getByText(/plan summary/i)).toBeInTheDocument());
  });

  it("renders history list and loads selected plan", async () => {
    fetchDailyLearningPlanHistory.mockResolvedValue({
      attempts: [
        {
          id: "h1",
          created_at: "2026-04-22T00:00:00.000Z",
          daily_time_minutes: 30,
          plan: {
            summary: { main_focus: "listening", reason: "declining" },
            tasks: [
              { type: "listening_practice", focus: "detail listening", duration_minutes: 18, reason: "primary focus" },
              { type: "vocab_training", focus: "audio collocations", duration_minutes: 12, reason: "support" },
            ],
          },
        },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText(/recent daily plans/i)).toBeInTheDocument());
    expect(screen.getByText(/mix: listening practice 60% \/ vocabulary practice 40%/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /listening · 30 min/i }));
    expect(screen.getByText(/main focus: listening/i)).toBeInTheDocument();
  });
});
