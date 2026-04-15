import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrainingExerciseCard from "../../components/ielts/reading/TrainingExerciseCard";

const EXERCISE = {
  type:        "paraphrase_match",
  prompt:      "Which sentence means the same as 'Urban farming has grown'?",
  options:     ["A. City agriculture expanded", "B. Rural farming declined"],
  answer:      "A. City agriculture expanded",
  explanation: "'Grown' is paraphrased as 'expanded'.",
};

describe("TrainingExerciseCard", () => {
  it("renders the exercise prompt and options", () => {
    render(
      <TrainingExerciseCard
        exercise={EXERCISE}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
        isLast={false}
      />
    );

    expect(screen.getByText(EXERCISE.prompt)).toBeTruthy();
    expect(screen.getByText("A. City agriculture expanded")).toBeTruthy();
    expect(screen.getByText("B. Rural farming declined")).toBeTruthy();
  });

  it("calls onAnswer when an option is selected", () => {
    const onAnswer = vi.fn();
    render(
      <TrainingExerciseCard
        exercise={EXERCISE}
        onAnswer={onAnswer}
        onNext={vi.fn()}
        isLast={false}
      />
    );

    fireEvent.click(screen.getByText("A. City agriculture expanded"));
    expect(onAnswer).toHaveBeenCalledWith("A. City agriculture expanded");
  });

  it("shows explanation and Next button after selection", () => {
    render(
      <TrainingExerciseCard
        exercise={EXERCISE}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
        isLast={false}
      />
    );

    fireEvent.click(screen.getByText("A. City agriculture expanded"));
    expect(screen.getByText(EXERCISE.explanation)).toBeTruthy();
    expect(screen.getByText("Next Exercise")).toBeTruthy();
  });

  it("shows 'See Results' on last exercise", () => {
    render(
      <TrainingExerciseCard
        exercise={EXERCISE}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
        isLast={true}
      />
    );

    fireEvent.click(screen.getByText("A. City agriculture expanded"));
    expect(screen.getByText("See Results")).toBeTruthy();
  });

  it("calls onNext when Next button is clicked", () => {
    const onNext = vi.fn();
    render(
      <TrainingExerciseCard
        exercise={EXERCISE}
        onAnswer={vi.fn()}
        onNext={onNext}
        isLast={false}
      />
    );

    fireEvent.click(screen.getByText("A. City agriculture expanded"));
    fireEvent.click(screen.getByText("Next Exercise"));
    expect(onNext).toHaveBeenCalled();
  });

  it("returns null when exercise is not provided", () => {
    const { container } = render(
      <TrainingExerciseCard exercise={null} onAnswer={vi.fn()} onNext={vi.fn()} isLast={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
