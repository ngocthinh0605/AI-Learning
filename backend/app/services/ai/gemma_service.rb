module Ai
  # Handles all communication with the local Ollama (Gemma) LLM.
  # Separated from UI/controller logic per architecture rules.
  #
  # Usage:
  #   result = Ai::GemmaService.new(user_text, history, english_level: "B2").call
  #   if result[:status] == :success
  #     parsed = Ai::GemmaService.parse_response(result[:raw])
  #   end
  class GemmaService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }

    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    # System prompt that defines the AI tutor's personality and behavior.
    # Using [CORRECTION] and [VOCABULARY] markers lets the LLM do grammar
    # analysis inline without requiring a second API call or NLP pipeline.
    SYSTEM_PROMPT = <<~PROMPT.freeze
      You are a professional English Language Tutor named "Aria". Your goals are to:
      1. Hold natural, engaging conversations in English.
      2. Match your vocabulary and complexity to the student's level.
      3. If the student makes a significant grammatical error, correct them
         inline using the format [Correction: ...], then continue naturally.
      4. Introduce 1-2 new vocabulary words per conversation when appropriate.
      5. Be encouraging, patient, and culturally sensitive.

      After your main response, append the following sections only when relevant:
      [CORRECTION]: <brief correction note>
      [VOCABULARY]: <word> | <definition> | <example sentence>
    PROMPT

    # @param user_message    [String]  The student's latest message
    # @param history         [Array]   Previous messages [{role:, content:}, ...]
    # @param english_level   [String]  CEFR level string, e.g. "B1"
    def initialize(user_message, history = [], english_level: "B1")
      @user_message = user_message
      @conversation_history = history
      @english_level = english_level
    end

    # Sends the message to Ollama and returns a status hash.
    # Returns { status: :success, raw: String } on success,
    #         { status: :error,   error: String } on any failure.
    # Reason: returning a status hash (rather than raising) keeps controller
    # logic simple — a plain `if result[:status] == :success` branch suffices.
    def call
      payload = prepare_payload

      response = self.class.post(
        "/api/chat",
        body: payload.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 120
      )

      if response.success?
        raw_content = response.parsed_response.dig("message", "content")
        raw_content.present? ? { status: :success, raw: raw_content } : handle_empty
      else
        handle_error(response)
      end
    rescue StandardError => e
      { status: :error, error: "Connection to Ollama failed: #{e.message}" }
    end

    # Parses [CORRECTION] and [VOCABULARY] markers out of a raw LLM response.
    # Returns { reply: String, correction: String|nil, vocabulary: Hash|nil }
    def self.parse_response(raw_text)
      correction  = raw_text.match(/\[CORRECTION\]:\s*(.+?)(?=\[|$)/m)&.captures&.first&.strip
      vocab_match = raw_text.match(/\[VOCABULARY\]:\s*(.+?)\|(.+?)\|(.+?)(?=\[|$)/m)

      clean_reply = raw_text
        .gsub(/\[CORRECTION\]:.+?(?=\[|$)/m, "")
        .gsub(/\[VOCABULARY\]:.+?(?=\[|$)/m, "")
        .strip

      vocabulary = if vocab_match
        {
          word:             vocab_match[1].strip,
          definition:       vocab_match[2].strip,
          context_sentence: vocab_match[3].strip
        }
      end

      { reply: clean_reply, correction: correction, vocabulary: vocabulary }
    end

    private

    # Builds the full Ollama /api/chat payload.
    # Message order: system prompt → conversation history → new user message.
    def prepare_payload
      messages = [{ role: "system", content: system_prompt_for_level }]
      messages += @conversation_history.map { |m| { role: m[:role], content: m[:content] } }
      messages << { role: "user", content: @user_message }

      { model: MODEL, messages: messages, stream: false }
    end

    def system_prompt_for_level
      "#{SYSTEM_PROMPT}\n\nStudent's current English level: #{@english_level}. Adjust your language complexity accordingly."
    end

    def handle_error(response)
      { status: :error, error: "Ollama Error: #{response.code} - #{response.message}" }
    end

    def handle_empty
      { status: :error, error: "Ollama returned an empty response" }
    end
  end
end
