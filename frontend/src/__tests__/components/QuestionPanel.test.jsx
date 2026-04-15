import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionPanel from "../../components/ielts/reading/QuestionPanel";

const MCQ_QUESTION = {
  id: 1, type: "mcq",
  question: "What is the main argument?",
  options: ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
  answer: "B",
};

const TFNG_QUESTION = {
  id: 2, type: "true_false_not_given",
  statement: "The author believes technology is harmful.",
  answer: "FALSE",
};

const FILL_QUESTION = {
  id: 3, type: "fill_blank",
  sentence: "The study found that ___ is essential.",
  answer: "WATER",
};

describe("QuestionPanel", () => {
  describe("MCQ type", () => {
    it("renders the question text", () => {
      render(<QuestionPanel question={MCQ_QUESTION} answer="" onChange={vi.fn()} submitted={false} />);
      expect(screen.getByText("What is the main argument?")).toBeInTheDocument();
    });

    it("renders all four options", () => {
      render(<QuestionPanel question={MCQ_QUESTION} answer="" onChange={vi.fn()} submitted={false} />);
      expect(screen.getByText("A. Option one")).toBeInTheDocument();
      expect(screen.getByText("D. Option four")).toBeInTheDocument();
    });

    it("calls onChange with the letter when an option is clicked", () => {
      const onChange = vi.fn();
      render(<QuestionPanel question={MCQ_QUESTION} answer="" onChange={onChange} submitted={false} />);
      fireEvent.click(screen.getByText("B. Option two"));
      expect(onChange).toHaveBeenCalledWith(1, "B");
    });

    it("does not call onChange when submitted", () => {
      const onChange = vi.fn();
      const feedback = { is_correct: true, explanation: "Correct!" };
      render(
        <QuestionPanel question={MCQ_QUESTION} answer="B" onChange={onChange} submitted feedback={feedback} />
      );
      fireEvent.click(screen.getByText("A. Option one"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("True/False/Not Given type", () => {
    it("renders TRUE, FALSE, NOT GIVEN buttons", () => {
      render(<QuestionPanel question={TFNG_QUESTION} answer="" onChange={vi.fn()} submitted={false} />);
      expect(screen.getByText("TRUE")).toBeInTheDocument();
      expect(screen.getByText("FALSE")).toBeInTheDocument();
      expect(screen.getByText("NOT GIVEN")).toBeInTheDocument();
    });

    it("calls onChange with the selected value", () => {
      const onChange = vi.fn();
      render(<QuestionPanel question={TFNG_QUESTION} answer="" onChange={onChange} submitted={false} />);
      fireEvent.click(screen.getByText("NOT GIVEN"));
      expect(onChange).toHaveBeenCalledWith(2, "NOT GIVEN");
    });
  });

  describe("Fill in the blank type", () => {
    it("renders an input field", () => {
      render(<QuestionPanel question={FILL_QUESTION} answer="" onChange={vi.fn()} submitted={false} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("calls onChange with uppercased input value", () => {
      const onChange = vi.fn();
      render(<QuestionPanel question={FILL_QUESTION} answer="" onChange={onChange} submitted={false} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "water" } });
      expect(onChange).toHaveBeenCalledWith(3, "WATER");
    });

    it("disables the input when submitted", () => {
      const feedback = { is_correct: true, explanation: "Correct!" };
      render(
        <QuestionPanel question={FILL_QUESTION} answer="WATER" onChange={vi.fn()} submitted feedback={feedback} />
      );
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("feedback display", () => {
    it("shows explanation text after submission", () => {
      const feedback = { is_correct: false, explanation: "The correct answer was B." };
      render(
        <QuestionPanel question={MCQ_QUESTION} answer="A" onChange={vi.fn()} submitted feedback={feedback} />
      );
      expect(screen.getByText("The correct answer was B.")).toBeInTheDocument();
    });

    it("does not show explanation before submission", () => {
      render(<QuestionPanel question={MCQ_QUESTION} answer="" onChange={vi.fn()} submitted={false} />);
      expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();
    });
  });
});
