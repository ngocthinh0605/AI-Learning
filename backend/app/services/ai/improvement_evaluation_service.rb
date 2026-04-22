# frozen_string_literal: true

module Ai
  # Compares pre/post-training performance and returns a strict improvement object.
  class ImprovementEvaluationService
    SYSTEM = <<~PROMPT.freeze
      You are an IELTS progress evaluator.

      Your job is to compare user performance BEFORE and AFTER training.

      INPUT:
      - Previous attempt data
      - Training session results

      OBJECTIVE:
      Measure improvement and explain it clearly.

      OUTPUT (STRICT JSON):
      {
        "improvement": {
          "before": 0.4,
          "after": 0.65,
          "delta": 0.25
        },
        "insight": "...",
        "next_focus": "..."
      }

      IMPORTANT:
      - Be honest (no fake improvement)
      - Focus on skill change, not just score
      - Return valid JSON only
    PROMPT

    def self.call(previous_attempt_data:, training_session_results:)
      user_prompt = <<~PROMPT
        INPUT:
        Previous attempt data:
        #{JSON.generate(previous_attempt_data)}

        Training session results:
        #{JSON.generate(training_session_results)}
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user_prompt)
    end
  end
end
