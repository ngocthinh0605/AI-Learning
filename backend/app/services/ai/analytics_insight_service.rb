# frozen_string_literal: true

module Ai
  # Synthesizes session blobs into dashboard insights JSON.
  class AnalyticsInsightService
    SYSTEM = <<~PROMPT.freeze
      You are an objective learning analyst for IELTS preparation. Respond with valid JSON only, no markdown.
      Keys: weaknesses (array of { area, description, evidence, priority 1-3 }),
      progress_summary (string),
      next_recommendations (array of strings),
      estimated_band (number).
    PROMPT

    # @param learning_data [Hash] aggregated sessions + profile snapshot
    def self.call(learning_data:)
      user = <<~PROMPT.strip
        Analyse the following learning_data JSON and produce the summary object.

        learning_data:
        #{JSON.generate(learning_data)}
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user)
    end
  end
end
