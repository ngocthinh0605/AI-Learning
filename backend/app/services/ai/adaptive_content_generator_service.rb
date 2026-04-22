# frozen_string_literal: true

module Ai
  # Generates a mock passage + questions from band and weakness placeholders.
  class AdaptiveContentGeneratorService
    SYSTEM = <<~PROMPT.freeze
      You are an IELTS examiner and curriculum designer. Respond with valid JSON only, no markdown.
      Output must be a single object: { "passage": string, "questions": array of objects,
      each with: "type", "question", "options" (array of strings, empty if not applicable),
      "answer", "explanation" }.
      Optionally include "meta" with target_band, weak_question_types, weak_topics as strings or arrays.
    PROMPT

    # @param band [String, Float]
    # @param question_types [Array, String]
    # @param topics [Array, String]
    def self.call(band:, question_types:, topics:)
      qt = Array(question_types).join(", ")
      tp = Array(topics).join(", ")

      user = <<~PROMPT.strip
        Band: #{band}
        Weak question types: #{qt}
        Weak vocabulary topics: #{tp}

        Generate one full mock reading passage and associated practice questions targeting these weaknesses.
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user)
    end
  end
end
