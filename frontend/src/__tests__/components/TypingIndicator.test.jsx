import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TypingIndicator from "../../components/chat/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders an accessible typing status", () => {
    render(<TypingIndicator />);
    expect(screen.getByRole("status", { name: /assistant is typing/i })).toBeInTheDocument();
  });

  it("renders compact variant for inline use", () => {
    const { container } = render(<TypingIndicator compact />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(container.querySelectorAll("span").length).toBeGreaterThanOrEqual(3);
  });
});
