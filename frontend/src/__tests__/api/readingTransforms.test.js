import { describe, it, expect } from "vitest";
import {
  normalizePassageBody,
  normalizeQuestion,
  normalizePassageResponse,
} from "../../api/readingTransforms";

describe("readingTransforms", () => {
  it("converts ruby-hash paragraph text into readable paragraphs", () => {
    const body =
      '{"A"=>"Neuroscience is growing rapidly.","B"=>"Brain imaging provides insights."}';

    const normalized = normalizePassageBody(body);

    expect(normalized).toContain("A. Neuroscience is growing rapidly.");
    expect(normalized).toContain("B. Brain imaging provides insights.");
    expect(normalized).not.toContain("=>");
  });

  it("creates fallback question text when question title is missing", () => {
    const normalized = normalizeQuestion(
      {
        id: 6,
        type: "matching_headings",
        paragraph: "C",
        headings: ["i. Heading one", "ii. Heading two"],
      },
      0
    );

    expect(normalized.question).toBe("Choose the best heading for paragraph C.");
  });

  it("keeps raw body when malformed hash-like string cannot be parsed", () => {
    const badBody = '{"A"=>"Missing end quote}';
    const normalized = normalizePassageBody(badBody);
    expect(normalized).toBe(badBody);
  });

  it("normalizes body and questions in passage response", () => {
    const response = normalizePassageResponse({
      id: "p1",
      body: '{"A"=>"One.","B"=>"Two."}',
      questions: [
        { type: "matching_information", statements: ["s1"], paragraphs: ["A", "B"] },
      ],
    });

    expect(response.body).toContain("A. One.");
    expect(response.questions[0].id).toBe(1);
    expect(response.questions[0].question).toBe(
      "Match each statement to the correct paragraph."
    );
  });
});
