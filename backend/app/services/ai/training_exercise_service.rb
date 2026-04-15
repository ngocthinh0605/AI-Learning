module Ai
  # Generates micro-exercises tailored to a user's weakness type.
  #
  # Exercise types produced:
  #   keyword_spotting   — find the key word(s) in a sentence
  #   paraphrase_match   — match a paraphrase to the original sentence
  #   main_idea          — identify the main idea of a paragraph
  #   scanning_practice  — locate specific information quickly
  #
  # Usage:
  #   result = Ai::TrainingExerciseService.new(weakness_type: "paraphrase",
  #                                            passage_snippet: "...").call
  #   # result: { status: :success, exercises: [...] }
  class TrainingExerciseService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    WEAKNESS_TO_EXERCISE = {
      "paraphrase"  => "paraphrase_match",
      "vocabulary"  => "keyword_spotting",
      "scanning"    => "scanning_practice",
      "trap"        => "main_idea",
      "misread"     => "keyword_spotting"
    }.freeze

    # @param weakness_type   [String] one of WeaknessAnalysisService::ERROR_TYPES
    # @param passage_snippet [String] a paragraph or two from a passage
    # @param count           [Integer] number of exercises to generate (default 3)
    def initialize(weakness_type:, passage_snippet:, count: 3)
      @weakness_type   = weakness_type
      @passage_snippet = passage_snippet.to_s.truncate(1500)
      @count           = count.clamp(1, 5)
      @exercise_type   = WEAKNESS_TO_EXERCISE.fetch(weakness_type, "keyword_spotting")
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
        You are an IELTS reading skills trainer. Generate focused micro-exercises
        to help students improve specific reading sub-skills. Always respond with
        valid JSON only.
      PROMPT
    end

    def user_prompt
      <<~PROMPT.strip
        Generate #{@count} #{@exercise_type} exercises based on this passage:

        #{@passage_snippet}

        Return ONLY a JSON array of exercise objects:
        [
          {
            "type": "#{@exercise_type}",
            "prompt": "Exercise instruction or question",
            "options": ["option A", "option B", "option C", "option D"],
            "answer": "correct option or answer text",
            "explanation": "Why this is the correct answer"
          }
        ]

        Exercise type guidelines:
        - paraphrase_match: give a sentence from the passage, ask which option means the same
        - keyword_spotting: give a question, ask which word(s) are the key to finding the answer
        - scanning_practice: ask where specific information appears in the passage
        - main_idea: ask what the main idea of a paragraph is
      PROMPT
    end

    def parse_response(raw)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      exercises = JSON.parse(cleaned)
      return { status: :error, error: "Invalid exercise format" } unless exercises.is_a?(Array)

      { status: :success, exercises: exercises }
    rescue JSON::ParserError => e
      { status: :error, error: "Failed to parse exercises: #{e.message}" }
    end
  end
end
