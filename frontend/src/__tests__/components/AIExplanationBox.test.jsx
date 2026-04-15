import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AIExplanationBox from "../../components/ielts/reading/AIExplanationBox";

describe("AIExplanationBox", () => {
  it("renders the error type badge and explanation", () => {
    render(
      <AIExplanationBox
        errorType="paraphrase"
        explanation="The passage uses a synonym for the key term."
        suggestion="Practice identifying synonyms in academic texts."
      />
    );

    expect(screen.getByText(/Paraphrase Issue/i)).toBeTruthy();
    expect(screen.getByText("The passage uses a synonym for the key term.")).toBeTruthy();
    expect(screen.getByText("Practice identifying synonyms in academic texts.")).toBeTruthy();
  });

  it("renders all known error types without crashing", () => {
    const types = ["vocabulary", "paraphrase", "scanning", "trap", "misread"];
    types.forEach((errorType) => {
      const { unmount } = render(
        <AIExplanationBox errorType={errorType} explanation="Test" suggestion="Test" />
      );
      unmount();
    });
  });

  it("renders gracefully with unknown error type", () => {
    render(
      <AIExplanationBox
        errorType="unknown_type"
        explanation="Some explanation"
        suggestion={null}
      />
    );
    expect(screen.getByText("Some explanation")).toBeTruthy();
  });

  it("does not render suggestion section when suggestion is absent", () => {
    render(
      <AIExplanationBox errorType="trap" explanation="Trap explanation" suggestion={null} />
    );
    // Should render explanation but no suggestion lightbulb text
    expect(screen.getByText("Trap explanation")).toBeTruthy();
    expect(screen.queryByText(/Practice/i)).toBeNull();
  });
});
