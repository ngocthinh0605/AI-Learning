module Ai
  # Generates pronunciation (IPA) and a fresh example sentence for a vocabulary word.
  #
  # Kept separate from GemmaService because the task is entirely different:
  # no conversation history, no correction markers — just a focused dictionary-style
  # lookup prompt that always returns a strict structured format.
  #
  # Usage:
  #   result = Ai::VocabEnrichService.new("enthusiasm", english_level: "B1").call
  #   if result[:status] == :success
  #     result[:pronunciation]    # => "/ɪnˈθjuːziæzəm/"
  #     result[:example_sentence] # => "Her enthusiasm for learning was inspiring."
  #   end
  class VocabEnrichService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    def initialize(word, english_level: "B1")
      @word          = word.to_s.strip
      @english_level = english_level
    end

    def call
      response = self.class.post(
        "/api/chat",
        body: payload.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 60
      )

      if response.success?
        raw = response.parsed_response.dig("message", "content").to_s.strip
        parse(raw)
      else
        { status: :error, error: "Ollama error: #{response.code}" }
      end
    rescue StandardError => e
      { status: :error, error: "Connection failed: #{e.message}" }
    end

    private

    def payload
      {
        model: MODEL,
        stream: false,
        messages: [
          { role: "system", content: system_prompt },
          { role: "user",   content: "Word: #{@word}" }
        ]
      }
    end

    # Allowed word types — must match VocabularyWord::WORD_TYPES so the controller
    # can safely persist the value without extra sanitisation.
    WORD_TYPES = %w[noun verb adjective adverb pronoun preposition conjunction interjection phrase].freeze

    def system_prompt
      <<~PROMPT.strip
        You are a dictionary assistant. Given a single English word, respond ONLY with
        this exact three-line format and nothing else:

        WORD_TYPE: <one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, phrase>
        PRONUNCIATION: <IPA transcription enclosed in /slashes/>
        EXAMPLE: <one natural example sentence appropriate for a #{@english_level} English learner>

        Do not add any explanation, greeting, or extra lines.
      PROMPT
    end

    # Parses the strict three-line response from the model.
    # Falls back gracefully when the model adds extra commentary.
    def parse(raw)
      raw_word_type    = raw.match(/WORD_TYPE:\s*(.+)/i)&.captures&.first&.strip&.downcase
      pronunciation    = raw.match(/PRONUNCIATION:\s*(.+)/i)&.captures&.first&.strip
      example_sentence = raw.match(/EXAMPLE:\s*(.+)/i)&.captures&.first&.strip

      # Only accept a word_type the model returns if it's in the allowed list
      word_type = WORD_TYPES.include?(raw_word_type) ? raw_word_type : nil

      if pronunciation.present? || example_sentence.present? || word_type.present?
        {
          status:           :success,
          word_type:        word_type,
          pronunciation:    pronunciation,
          example_sentence: example_sentence
        }
      else
        { status: :error, error: "Unexpected response format: #{raw.first(200)}" }
      end
    end
  end
end
