module Ai
  # Generates similar questions to ones the user got wrong, for Review Mode.
  #
  # Usage:
  #   result = Ai::SimilarQuestionService.new(wrong_questions, passage_body).call
  #   # result: { status: :success, questions: [...] }
  class SimilarQuestionService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    # @param wrong_questions [Array<Hash>] original question objects that were answered incorrectly
    # @param passage_body    [String]      the full passage text
    def initialize(wrong_questions, passage_body)
      @wrong_questions = wrong_questions.first(4)  # cap at 4 to keep prompt manageable
      @passage_body    = passage_body.to_s.truncate(2000)
    end

    def call
      return { status: :success, questions: [] } if @wrong_questions.empty?

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
        { status: :error, error: "Ollama Error: #{response.code}" }
      end
    rescue StandardError => e
      { status: :error, error: "Connection failed: #{e.message}" }
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
        You are an IELTS examiner. Generate new practice questions similar to ones
        a student got wrong, using the same passage. Always respond with valid JSON only.
      PROMPT
    end

    def user_prompt
      questions_text = @wrong_questions.map do |q|
        "Type: #{q["type"]} | #{q["question"] || q["statement"] || q["sentence"] || ""}"
      end.join("\n")

      <<~PROMPT.strip
        Passage:
        #{@passage_body}

        The student got these questions wrong:
        #{questions_text}

        Generate one new similar question for each wrong question above.
        Use the same question type and test a similar skill from the same passage.

        Return ONLY a JSON array using the same question object format:
        [
          {
            "id": 101,
            "type": "mcq",
            "question": "...",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "B",
            "location_in_passage": "short phrase from passage near the answer"
          }
        ]
      PROMPT
    end

    def parse_response(raw)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      questions = JSON.parse(cleaned)
      return { status: :error, error: "Invalid format" } unless questions.is_a?(Array)

      { status: :success, questions: questions }
    rescue JSON::ParserError => e
      { status: :error, error: "Failed to parse: #{e.message}" }
    end
  end
end
