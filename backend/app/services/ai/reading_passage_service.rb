module Ai
  # Generates an IELTS-style reading passage with comprehension questions
  # by prompting the local Ollama (Gemma) LLM.
  #
  # Usage:
  #   result = Ai::ReadingPassageService.new(difficulty: "band_6", topic: "climate").call
  #   if result[:status] == :success
  #     data = result[:data]  # { title:, body:, questions: [...] }
  #   end
  class ReadingPassageService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }
    MAX_RETRIES = 2

    DIFFICULTY_DESCRIPTIONS = {
      "band_5" => "Band 5 (intermediate): simple vocabulary, clear structure, straightforward ideas",
      "band_6" => "Band 6 (upper-intermediate): moderate vocabulary, some complex sentences",
      "band_7" => "Band 7 (advanced): academic vocabulary, complex arguments, dense information",
      "band_8" => "Band 8 (near-native): highly academic, nuanced arguments, sophisticated language"
    }.freeze

    # @param difficulty    [String] one of band_5..band_8
    # @param topic         [String] optional topic hint (e.g. "climate change")
    # @param passage_type  [String] "academic" or "general"
    def initialize(difficulty: "band_6", topic: nil, passage_type: "academic")
      @difficulty   = difficulty
      @topic        = topic.presence || random_topic
      @passage_type = passage_type
    end

    # Calls Ollama and returns a status hash.
    # On success: { status: :success, data: { title:, body:, questions: [] } }
    # On failure: { status: :error, error: String }
    def call
      attempts = 0
      while attempts < MAX_RETRIES
        attempts += 1
        begin
          response = self.class.post(
            "/api/chat",
            body: payload.to_json,
            headers: { "Content-Type" => "application/json" },
            timeout: 180
          )

          if response.success?
            raw = response.parsed_response.dig("message", "content")
            return parse_response(raw)
          end

          return { status: :error, error: format_ollama_error(response) } unless retryable_ollama_error?(response)
          # Reason: local Ollama can occasionally return transient 5xx while loading models.
          sleep 1 if attempts < MAX_RETRIES
        rescue StandardError => e
          return { status: :error, error: "Connection to Ollama failed: #{e.message}" } if attempts >= MAX_RETRIES
        end
      end

      { status: :error, error: "Connection to Ollama failed: retries exceeded" }
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
        You are an expert IELTS examiner and content creator. Your task is to generate
        authentic IELTS reading materials. Always respond with valid JSON only — no
        markdown fences, no explanations outside the JSON structure.
      PROMPT
    end

    def user_prompt
      <<~PROMPT.strip
        Generate an IELTS #{@passage_type} reading passage about "#{@topic}" at
        #{DIFFICULTY_DESCRIPTIONS.fetch(@difficulty, DIFFICULTY_DESCRIPTIONS["band_6"])}.

        Return ONLY a JSON object with this exact structure:
        {
          "title": "Passage title",
          "body": "Full passage text (600-900 words). Divide into paragraphs labelled A, B, C, D, E.",
          "questions": [
            {
              "id": 1,
              "type": "mcq",
              "question": "Question text?",
              "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
              "answer": "A",
              "location_in_passage": "short verbatim phrase from the passage near the answer"
            },
            {
              "id": 2,
              "type": "true_false_not_given",
              "statement": "Statement to evaluate",
              "answer": "TRUE",
              "location_in_passage": "short verbatim phrase from the passage"
            },
            {
              "id": 3,
              "type": "fill_blank",
              "sentence": "The author argues that ___ is essential.",
              "answer": "correct word or phrase",
              "location_in_passage": "short verbatim phrase from the passage"
            },
            {
              "id": 4,
              "type": "matching_headings",
              "paragraph": "A",
              "headings": ["i. ...", "ii. ...", "iii. ...", "iv. ..."],
              "answer": "ii",
              "location_in_passage": "first sentence of paragraph A"
            },
            {
              "id": 5,
              "type": "matching_information",
              "statements": ["Statement about a specific detail", "Another specific claim"],
              "paragraphs": ["A", "B", "C", "D"],
              "answers": {"1": "B", "2": "D"},
              "location_in_passage": "relevant phrase from the passage"
            },
            {
              "id": 6,
              "type": "summary_completion",
              "summary": "The study found that ___ contributed to ___ in urban areas.",
              "word_box": ["innovation", "decline", "growth", "research", "pollution", "migration"],
              "answers": ["research", "growth"],
              "location_in_passage": "short verbatim phrase from the passage"
            }
          ]
        }

        Requirements:
        - Include exactly 13 questions: 3 MCQ, 3 True/False/Not Given, 2 fill_blank,
          2 matching_headings, 2 matching_information, 1 summary_completion
        - Every question MUST include location_in_passage (a short verbatim phrase from body)
        - Questions must be answerable from the passage text
        - Answers must be accurate
        - Do not include any text outside the JSON object
      PROMPT
    end

    # Reason: Ollama sometimes wraps JSON in markdown fences even when instructed
    # not to, so we strip them before parsing.
    def parse_response(raw)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      data = JSON.parse(cleaned)

      unless data["title"] && data["body"] && data["questions"].is_a?(Array)
        return { status: :error, error: "AI returned malformed passage structure" }
      end

      { status: :success, data: data.symbolize_keys }
    rescue JSON::ParserError => e
      { status: :error, error: "Failed to parse AI response as JSON: #{e.message}" }
    end

    def retryable_ollama_error?(response)
      response.code.to_i >= 500
    end

    def format_ollama_error(response)
      detail = begin
        body = response.parsed_response
        case body
        when Hash
          body["error"] || body.to_json
        when String
          body
        else
          response.body.to_s
        end
      rescue StandardError
        response.body.to_s
      end

      compact_detail = detail.to_s.gsub(/\s+/, " ").strip
      compact_detail = compact_detail[0, 200] if compact_detail.length > 200
      "Ollama Error: #{response.code} - #{response.message}. #{compact_detail}".strip
    end

    ACADEMIC_TOPICS = %w[
      technology environment psychology economics archaeology
      linguistics neuroscience urbanisation biodiversity climate
    ].freeze

    GENERAL_TOPICS = %w[
      travel cooking health sports history art music fashion
      education community volunteering
    ].freeze

    def random_topic
      list = @passage_type == "general" ? GENERAL_TOPICS : ACADEMIC_TOPICS
      list.sample
    end
  end
end
