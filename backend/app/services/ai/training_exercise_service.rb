module Ai
  # Generates targeted training questions from explicit weakness signals.
  class TrainingExerciseService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    ALLOWED_TASK_TYPES = %w[
      reading_training
      vocab_training
      inference_training
      paraphrase_training
      speaking_practice
      listening_practice
    ].freeze

    QUESTION_KEYS = %w[question options correct_answer explanation].freeze

    # @param task_type       [String]
    # @param weakness_focus  [String]
    # @param cognitive_bias  [String]
    # @param passage_snippet [String]
    # @param count           [Integer]
    def initialize(task_type:, weakness_focus:, cognitive_bias:, passage_snippet:, count: 3)
      @task_type = ALLOWED_TASK_TYPES.include?(task_type) ? task_type : "reading_training"
      @weakness_focus = weakness_focus.to_s.presence || "reading accuracy"
      @cognitive_bias = cognitive_bias.to_s.presence || "keyword_matching_bias"
      @passage_snippet = passage_snippet.to_s.truncate(1500)
      @count           = count.clamp(1, 5)
    end

    def call
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
        You are an IELTS training generator.
        Your task is to create exercises that FIX the user's specific weaknesses.

        INPUT:
        - Task type
        - Weakness focus
        - Cognitive bias

        OBJECTIVE:
        Create targeted exercises that directly address the weakness.

        RULES:
        - Include traps if user struggles with traps
        - Include paraphrasing if user struggles with paraphrase
        - Avoid generic questions

        OUTPUT (STRICT JSON):
        {
          "questions": [
            {
              "question": "...",
              "options": ["A", "B", "C"],
              "correct_answer": "A",
              "explanation": "..."
            }
          ]
        }

        Return valid JSON only.
      PROMPT
    end

    def user_prompt
      <<~PROMPT.strip
        Task type: #{@task_type}
        Weakness focus: #{@weakness_focus}
        Cognitive bias: #{@cognitive_bias}
        Number of questions: #{@count}

        Passage context (optional):
        #{@passage_snippet}

        Generate targeted exercises only.
      PROMPT
    end

    def parse_response(raw)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      payload = JSON.parse(cleaned)
      return { status: :error, error: "Invalid exercise format" } unless payload.is_a?(Hash)

      questions = payload["questions"]
      return { status: :error, error: "Invalid exercise format" } unless questions.is_a?(Array) && questions.any?

      normalized = questions.map.with_index do |question, idx|
        return { status: :error, error: "Question #{idx + 1} is invalid" } unless valid_question?(question)

        # Reason: keep frontend compatibility while migrating to strict question schema.
        {
          "question" => question["question"].to_s,
          "options" => question["options"],
          "correct_answer" => question["correct_answer"].to_s,
          "explanation" => question["explanation"].to_s,
          "prompt" => question["question"].to_s,
          "answer" => question["correct_answer"].to_s
        }
      end

      { status: :success, exercises: normalized }
    rescue JSON::ParserError => e
      { status: :error, error: "Failed to parse exercises: #{e.message}" }
    end

    def valid_question?(question)
      return false unless question.is_a?(Hash)
      return false unless question.keys.map(&:to_s).sort == QUESTION_KEYS.sort
      return false if question["question"].to_s.strip.empty?
      return false if question["correct_answer"].to_s.strip.empty?
      return false if question["explanation"].to_s.strip.empty?

      options = question["options"]
      return false unless options.is_a?(Array) && options.length >= 2
      options.all? { |o| o.is_a?(String) && o.strip.length >= 1 }
    end
  end
end
