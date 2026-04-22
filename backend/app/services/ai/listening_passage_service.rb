# frozen_string_literal: true

module Ai
  # Generates IELTS Listening-style script and questions.
  class ListeningPassageService
    SYSTEM = <<~PROMPT.freeze
      You are an IELTS Listening examiner assistant.
      Return valid JSON only, no markdown.
    PROMPT

    def self.call(difficulty:, topic:, accent:)
      user_prompt = <<~PROMPT
        Generate an IELTS listening practice set.
        Difficulty: #{difficulty}
        Topic: #{topic.presence || "daily life"}
        Accent hint: #{accent}

        Return JSON:
        {
          "title": "short title",
          "transcript": "120-220 words spoken script",
          "questions": [
            { "id": 1, "type": "mcq", "question": "...", "options": ["A","B","C","D"], "answer": "A" },
            { "id": 2, "type": "short_answer", "question": "...", "answer": "word or short phrase" },
            { "id": 3, "type": "true_false_not_given", "statement": "...", "answer": "TRUE" }
          ]
        }

        Requirements:
        - exactly 6 questions
        - include at least 2 mcq, 2 short_answer, 2 true_false_not_given
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user_prompt)
    end
  end
end
