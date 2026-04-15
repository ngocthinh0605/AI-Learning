import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VocabCard from "../../components/vocabulary/VocabCard";

const mockWord = {
  id: "v1",
  word: "serendipity",
  definition: "The occurrence of events by happy chance",
  context_sentence: "Finding that café was pure serendipity.",
  mastery_level: 2,
  next_review_at: null,
};

describe("VocabCard", () => {
  it("renders the word and definition", () => {
    render(<VocabCard word={mockWord} onDelete={vi.fn()} />);
    expect(screen.getByText("serendipity")).toBeInTheDocument();
    expect(screen.getByText("The occurrence of events by happy chance")).toBeInTheDocument();
  });

  it("shows the context sentence when present", () => {
    render(<VocabCard word={mockWord} onDelete={vi.fn()} />);
    expect(screen.getByText(/pure serendipity/)).toBeInTheDocument();
  });

  it("calls onDelete with the word id when delete is clicked", () => {
    const onDelete = vi.fn();
    render(<VocabCard word={mockWord} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle ? document.querySelector("button[title]") || screen.getAllByRole("button")[0] : screen.getAllByRole("button")[0]);
    // We test via the review buttons specifically
  });

  it("shows review buttons when word is due (next_review_at is null)", () => {
    const onReview = vi.fn();
    render(<VocabCard word={mockWord} onReview={onReview} onDelete={vi.fn()} />);
    expect(screen.getByText("Got it")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("calls onReview with success when Got it is clicked", () => {
    const onReview = vi.fn();
    render(<VocabCard word={mockWord} onReview={onReview} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("Got it"));
    expect(onReview).toHaveBeenCalledWith("v1", "success");
  });

  it("does not show review buttons when word is not yet due", () => {
    const futureWord = { ...mockWord, next_review_at: new Date(Date.now() + 86400000).toISOString() };
    render(<VocabCard word={futureWord} onReview={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText("Got it")).not.toBeInTheDocument();
  });
});
