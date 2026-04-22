import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WritingPage from "../../pages/ielts/WritingPage";

const gradeWritingEssay = vi.fn();
const fetchWritingAttempts = vi.fn();

vi.mock("../../api/writingApi", () => ({
  gradeWritingEssay: (...args) => gradeWritingEssay(...args),
  fetchWritingAttempts: (...args) => fetchWritingAttempts(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/ielts/writing"]}>
      <Routes>
        <Route path="/ielts/writing" element={<WritingPage />} />
        <Route path="/ielts" element={<div>IELTS Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("WritingPage", () => {
  beforeEach(() => {
    gradeWritingEssay.mockReset();
    fetchWritingAttempts.mockReset();
    fetchWritingAttempts.mockResolvedValue({ attempts: [] });
  });

  it("submits and renders grading result", async () => {
    gradeWritingEssay.mockResolvedValue({
      grading: {
        overall_band: 6.5,
        criteria: {
          task_response: { score: 6.0, feedback: "Good response." },
          coherence_cohesion: { score: 6.5, feedback: "Clear flow." },
          lexical_resource: { score: 6.0, feedback: "Enough vocabulary." },
          grammar_range_accuracy: { score: 6.0, feedback: "Some errors." },
        },
      },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/essay/i), { target: { value: "My essay content." } });
    fireEvent.click(screen.getByRole("button", { name: /grade essay/i }));

    await waitFor(() => {
      expect(gradeWritingEssay).toHaveBeenCalled();
      expect(screen.getByText(/overall band/i)).toBeInTheDocument();
      expect(screen.getByText("6.5")).toBeInTheDocument();
    });
  });

  it("shows edge validation for missing prompt or essay", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: /grade essay/i }));
    expect(screen.getByText(/prompt and essay are required/i)).toBeInTheDocument();
  });

  it("shows failure error from API", async () => {
    gradeWritingEssay.mockRejectedValue({ response: { data: { error: "LLM unavailable" } } });
    renderPage();
    fireEvent.change(screen.getByLabelText(/essay/i), { target: { value: "Essay" } });
    fireEvent.click(screen.getByRole("button", { name: /grade essay/i }));

    await waitFor(() => expect(screen.getByText(/llm unavailable/i)).toBeInTheDocument());
  });
});
