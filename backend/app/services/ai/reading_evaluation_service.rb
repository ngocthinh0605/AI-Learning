module Ai
  # Evaluates a user's answers against the correct answers for an IELTS
  # reading passage and returns per-question feedback plus a band score estimate.
  #
  # Usage:
  #   result = Ai::ReadingEvaluationService.new(questions, answers).call
  #   if result[:status] == :success
  #     feedback = result[:feedback]
  #     # { band_score: 6.5, tips: "...", questions: [{id:, correct:, explanation:}, ...] }
  #   end
  class ReadingEvaluationService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    # @param questions    [Array<Hash>] passage questions with correct answers
    # @param answers      [Hash]        user's answers keyed by question id string, e.g. { "1" => "A" }
    # @param passage_body [String]      full passage text (used for weakness analysis)
    def initialize(questions, answers, passage_body: "")
      @questions    = questions
      @answers      = answers.transform_keys(&:to_s)
      @passage_body = passage_body
    end

    # Returns { status: :success, feedback: Hash, score: Integer, total: Integer,
    #           weakness_analysis: Array }
    # weakness_analysis contains per-wrong-answer error_type + explanation from AI.
    def call
      # Reason: compute correctness locally first, then enrich wrong answers with
      # AI-classified error types in a second Ollama call.
      local_results = evaluate_locally
      wrong         = local_results.select { |r| !r["is_correct"] }

      # Run weakness analysis in parallel with band score evaluation
      weakness_data = Ai::WeaknessAnalysisService.new(wrong, @passage_body).call

      # Build a lookup map: question_id => weakness hash
      weakness_map = weakness_data.index_by { |w| w["id"].to_s }

      # Merge weakness data into local_results
      enriched = local_results.map do |r|
        w = weakness_map[r["id"].to_s]
        r.merge(
          "error_type"  => w&.dig("error_type"),
          "explanation" => w&.dig("explanation"),
          "suggestion"  => w&.dig("suggestion")
        )
      end

      response = self.class.post(
        "/api/chat",
        body: payload(enriched).to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 120
      )

      if response.success?
        raw = response.parsed_response.dig("message", "content")
        parse_feedback(raw, enriched, weakness_data)
      else
        fallback_feedback(enriched, weakness_data)
      end
    rescue StandardError
      enriched = evaluate_locally.map { |r| r.merge("error_type" => nil, "explanation" => nil, "suggestion" => nil) }
      fallback_feedback(enriched, [])
    end

    private

    # Computes correct/incorrect for each question without LLM.
    def evaluate_locally
      @questions.map do |q|
        q_id      = q["id"].to_s
        correct   = q["answer"].to_s.strip.upcase
        submitted = @answers[q_id].to_s.strip.upcase

        {
          "id"        => q["id"],
          "type"      => q["type"],
          "question"  => question_text(q),
          "correct"   => correct,
          "submitted" => submitted,
          "is_correct" => submitted == correct
        }
      end
    end

    def question_text(q)
      q["question"] || q["statement"] || q["sentence"] || ""
    end

    def payload(local_results)
      score = local_results.count { |r| r["is_correct"] }
      total = local_results.length

      {
        model: MODEL,
        messages: [
          { role: "system", content: system_prompt },
          { role: "user",   content: user_prompt(local_results, score, total) }
        ],
        stream: false
      }
    end

    def system_prompt
      <<~PROMPT.strip
        You are an expert IELTS examiner providing detailed feedback on a student's
        reading test performance. Always respond with valid JSON only.
      PROMPT
    end

    def user_prompt(results, score, total)
      results_text = results.map do |r|
        status = r["is_correct"] ? "CORRECT" : "INCORRECT"
        "Q#{r["id"]} (#{r["type"]}): #{r["question"]} | Student: #{r["submitted"]} | Correct: #{r["correct"]} | #{status}"
      end.join("\n")

      <<~PROMPT.strip
        A student answered #{score}/#{total} questions on an IELTS reading test.

        Results:
        #{results_text}

        Return ONLY a JSON object:
        {
          "band_score": 6.5,
          "tips": "2-3 sentences of personalised improvement advice",
          "questions": [
            {
              "id": 1,
              "is_correct": true,
              "explanation": "Brief explanation of why this answer is correct/incorrect"
            }
          ]
        }

        Band score guide: 0-3 correct = 4.0, 4-5 = 4.5, 6-7 = 5.0, 8-9 = 5.5,
        10 = 6.0, 11 = 6.5, 12 = 7.0, 13 = 7.5+
      PROMPT
    end

    def parse_feedback(raw, enriched_results, weakness_data)
      cleaned = raw.to_s
        .gsub(/\A```(?:json)?\s*/i, "")
        .gsub(/\s*```\z/, "")
        .strip

      data  = JSON.parse(cleaned)
      score = enriched_results.count { |r| r["is_correct"] }
      total = enriched_results.length

      # Merge error_type + suggestion from weakness analysis into feedback questions
      weakness_map = weakness_data.index_by { |w| w["id"].to_s }
      if data["questions"].is_a?(Array)
        data["questions"] = data["questions"].map do |q|
          w = weakness_map[q["id"].to_s]
          q.merge(
            "error_type" => w&.dig("error_type"),
            "suggestion" => w&.dig("suggestion")
          )
        end
      end

      { status: :success, feedback: data, score: score, total: total,
        weakness_analysis: weakness_data }
    rescue JSON::ParserError
      fallback_feedback(enriched_results, weakness_data)
    end

    # Returns basic feedback without AI band-score explanations.
    def fallback_feedback(enriched_results, weakness_data = [])
      score = enriched_results.count { |r| r["is_correct"] }
      total = enriched_results.length

      weakness_map = weakness_data.index_by { |w| w["id"].to_s }

      questions_fb = enriched_results.map do |r|
        w = weakness_map[r["id"].to_s]
        {
          "id"         => r["id"],
          "is_correct" => r["is_correct"],
          "explanation" => r["is_correct"] ? "Correct!" : (w&.dig("explanation") || "The correct answer was #{r["correct"]}."),
          "error_type"  => w&.dig("error_type"),
          "suggestion"  => w&.dig("suggestion")
        }
      end

      feedback = {
        "band_score" => estimate_band(score, total),
        "tips"       => "Keep practising to improve your reading speed and comprehension.",
        "questions"  => questions_fb
      }

      { status: :success, feedback: feedback, score: score, total: total,
        weakness_analysis: weakness_data }
    end

    def estimate_band(score, total)
      ratio = total.positive? ? score.to_f / total : 0
      case ratio
      when 0...0.31  then 4.0
      when 0.31...0.46 then 4.5
      when 0.46...0.62 then 5.0
      when 0.62...0.70 then 5.5
      when 0.70...0.78 then 6.0
      when 0.78...0.85 then 6.5
      when 0.85...0.93 then 7.0
      else 7.5
      end
    end
  end
end
