module Ai
  # Classifies why a user got a question wrong and provides an explanation.
  #
  # Usage:
  #   results = Ai::WeaknessAnalysisService.new(wrong_answers, passage_body).call
  #   # results: [{ id:, error_type:, explanation:, suggestion: }, ...]
  class WeaknessAnalysisService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    ERROR_TYPES = %w[vocabulary paraphrase scanning trap misread].freeze

    # @param wrong_answers [Array<Hash>] local_results entries where is_correct == false
    # @param passage_body  [String]      full passage text for context
    def initialize(wrong_answers, passage_body)
      @wrong_answers = wrong_answers
      @passage_body  = passage_body.to_s.truncate(2000)
    end

    # Returns Array of hashes, one per wrong answer.
    # Falls back to rule-based classification if Ollama is unavailable.
    def call
      return [] if @wrong_answers.empty?

      response = self.class.post(
        "/api/chat",
        body: payload.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 120
      )

      if response.success?
        raw = response.parsed_response.dig("message", "content")
        parse_response(raw)
      else
        fallback_analysis
      end
    rescue StandardError
      fallback_analysis
    end

    private

    def payload
      {
        model: MODEL,
        messages: [
          { role: "system", content: system_prompt },
          { role: "user",   content: user_prompt }
        ],
        stream: false
      }
    end

    def system_prompt
      <<~PROMPT.strip
        You are an expert IELTS reading instructor. Analyse why a student got
        questions wrong and classify each error. Always respond with valid JSON only.
      PROMPT
    end

    def user_prompt
      answers_text = @wrong_answers.map do |a|
        "Q#{a["id"]} (#{a["type"]}): #{a["question"]} | Student: #{a["submitted"]} | Correct: #{a["correct"]}"
      end.join("\n")

      <<~PROMPT.strip
        Passage excerpt (first 2000 chars):
        #{@passage_body}

        Wrong answers:
        #{answers_text}

        For each wrong answer, classify the error type from:
        - vocabulary: student didn't know a key word
        - paraphrase: student missed that the question paraphrased the passage
        - scanning: student looked in the wrong part of the passage
        - trap: True/False/Not Given trap or distractor option
        - misread: student misread or misunderstood the question

        Return ONLY a JSON array:
        [
          {
            "id": 1,
            "error_type": "paraphrase",
            "explanation": "The passage says X but the question uses Y which means the same thing.",
            "suggestion": "Practice identifying synonyms and paraphrases in academic texts."
          }
        ]
      PROMPT
    end

    def parse_response(raw)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      data = JSON.parse(cleaned)
      return fallback_analysis unless data.is_a?(Array)

      data.map do |item|
        {
          "id"          => item["id"],
          "error_type"  => ERROR_TYPES.include?(item["error_type"]) ? item["error_type"] : "misread",
          "explanation" => item["explanation"].to_s,
          "suggestion"  => item["suggestion"].to_s
        }
      end
    rescue JSON::ParserError
      fallback_analysis
    end

    # Rule-based fallback: classify by question type when Ollama is unavailable.
    def fallback_analysis
      @wrong_answers.map do |a|
        error_type = case a["type"]
                     when "true_false_not_given" then "trap"
                     when "fill_blank"           then "vocabulary"
                     when "summary_completion"   then "paraphrase"
                     else "scanning"
                     end

        {
          "id"          => a["id"],
          "error_type"  => error_type,
          "explanation" => "The correct answer was #{a["correct"]}.",
          "suggestion"  => "Review the relevant section of the passage carefully."
        }
      end
    end
  end
end
