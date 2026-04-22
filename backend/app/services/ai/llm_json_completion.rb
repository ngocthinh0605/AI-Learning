# frozen_string_literal: true

module Ai
  # Single-turn Ollama /api/chat expecting JSON-only output (no stream).
  class LlmJsonCompletion
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }

    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    # @param system_prompt [String]
    # @param user_prompt [String]
    # @param model [String, nil]
    # @return [Hash] { status: :success, data: Hash } or { status: :error, error: String }
    def self.call(system_prompt:, user_prompt:, model: nil)
      response = post(
        "/api/chat",
        body: {
          model: model.presence || MODEL,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: user_prompt }
          ],
          stream: false
        }.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 120
      )

      unless response.success?
        return { status: :error, error: "Ollama error: #{response.code}" }
      end

      raw = response.parsed_response.dig("message", "content").to_s
      parsed = json_from_model(raw)
      return { status: :error, error: "Empty or invalid JSON from model" } if parsed.blank?

      { status: :success, data: parsed }
    rescue StandardError => e
      { status: :error, error: e.message }
    end

    # Strips optional ```json fences and parses.
    def self.json_from_model(raw)
      text = raw.to_s.strip
      text = Regexp.last_match(1).strip if text =~ /\A```(?:json)?\s*([\s\S]*?)```\s*\z/m
      return nil if text.blank?

      JSON.parse(text)
    rescue JSON::ParserError
      nil
    end
  end
end
