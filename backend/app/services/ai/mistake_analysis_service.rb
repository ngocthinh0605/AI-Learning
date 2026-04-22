# frozen_string_literal: true

module Ai
  # Stage 1 foundation: analyze why user answers are wrong.
  class MistakeAnalysisService
    SYSTEM = <<~PROMPT.freeze
      You are an expert IELTS Reading tutor and cognitive analyst.
      Your task is to analyze a user's answers and identify WHY they made mistakes.

      Focus on deep mistake patterns, not just correctness.

      Classify into:
      1) Surface Errors: vocabulary_gap, misread_question, time_pressure
      2) Cognitive Errors: keyword_matching_bias, paraphrase_confusion, inference_failure, distractor_trap

      Return STRICT JSON only in this shape:
      {
        "summary": "...",
        "error_breakdown": {
          "keyword_matching_bias": 3,
          "paraphrase_confusion": 2
        },
        "skills": {
          "matching_heading": 0.4,
          "true_false": 0.7
        },
        "key_weakness": "..."
      }

      Be concise and data-driven.
    PROMPT

    def self.call(questions:, user_answers:, passage: nil)
      user_prompt = <<~PROMPT
        INPUT:
        Questions + correct answers:
        #{JSON.generate(questions)}

        User answers:
        #{JSON.generate(user_answers)}

        Passage (optional):
        #{passage.to_s}
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user_prompt)
    end
  end
end
