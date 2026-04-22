# frozen_string_literal: true

module Ai
  # Grades IELTS writing essays against common rubric categories.
  class WritingGradingService
    SYSTEM = <<~PROMPT.freeze
      You are a strict IELTS Writing examiner.
      Return valid JSON only.
    PROMPT

    def self.call(task_type:, prompt:, essay:)
      user_prompt = <<~PROMPT
        Grade this IELTS Writing #{task_type} essay.

        Prompt:
        #{prompt}

        Essay:
        #{essay}

        Return JSON only:
        {
          "overall_band": 6.5,
          "criteria": {
            "task_response": { "score": 6.0, "feedback": "..." },
            "coherence_cohesion": { "score": 6.5, "feedback": "..." },
            "lexical_resource": { "score": 6.0, "feedback": "..." },
            "grammar_range_accuracy": { "score": 6.0, "feedback": "..." }
          },
          "strengths": ["...", "..."],
          "improvements": ["...", "..."],
          "sample_rewrite": "1 short improved paragraph"
        }
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user_prompt)
    end
  end
end
