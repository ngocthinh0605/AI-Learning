import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ReadingPage from "../../pages/ielts/ReadingPage";

vi.mock("../../components/ielts/reading/PassagePracticeTab", () => ({
  default: () => <div>Practice Tab Content</div>,
}));

vi.mock("../../components/ielts/reading/MockTestTab", () => ({
  default: () => <div>Mock Tab Content</div>,
}));

vi.mock("../../components/ielts/reading/ProgressTab", () => ({
  default: () => <div>Progress Tab Content</div>,
}));

vi.mock("../../components/ielts/reading/TrainingTab", () => ({
  default: () => <div>Training Tab Content</div>,
}));

function renderPage(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/ielts/reading" element={<ReadingPage />} />
        <Route path="/ielts" element={<div>IELTS Landing</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ReadingPage tabs", () => {
  it("shows practice tab by default", () => {
    renderPage("/ielts/reading");
    expect(screen.getByText("Practice Tab Content")).toBeInTheDocument();
  });

  it("opens progress tab from query parameter", () => {
    renderPage("/ielts/reading?tab=progress");
    expect(screen.getByText("Progress Tab Content")).toBeInTheDocument();
  });

  it("switches content when clicking tab buttons", () => {
    renderPage("/ielts/reading");
    fireEvent.click(screen.getByRole("button", { name: /mock test/i }));
    expect(screen.getByText("Mock Tab Content")).toBeInTheDocument();
  });
});
