# frozen_string_literal: true

module Ai
  # Stateful tutor reply as natural text plus optional structured corrections (machine-readable).
  class TutorStructuredChatService
    SYSTEM = <<~PROMPT.freeze
      You simulate an expert human English tutor who remembers the student's profile.
      Respond with valid JSON only, no markdown.
      Keys: reply_text (string, natural conversational answer for the student),
      structured (object, optional): corrections (array of { user_phrase, suggestion, brief_rule }),
      vocabulary_highlights (array of strings), tone_notes (string).
      Keep tone_notes one of: encouraging, firm, neutral.
    PROMPT

    # @param learning_profile [Hash] serialized profile + weaknesses summary
    # @param history [Array<Hash>] { "role" => , "content" => }
    # @param message [String]
    def self.call(learning_profile:, history:, message:)
      hist = Array(history).last(12).map { |m| "#{m['role']}: #{m['content']}" }.join("\n")

      user = <<~PROMPT.strip
        Student profile (JSON):
        #{JSON.generate(learning_profile)}

        Conversation history:
        #{hist}

        New user message:
        #{message}
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user)
    end
  end
end
