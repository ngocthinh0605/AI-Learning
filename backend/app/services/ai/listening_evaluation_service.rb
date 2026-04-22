# frozen_string_literal: true

module Ai
  # Evaluates listening answers with tolerant normalization.
  class ListeningEvaluationService
    def initialize(questions, answers)
      @questions = Array(questions)
      @answers = (answers || {}).transform_keys(&:to_s)
    end

    def call
      rows = @questions.map do |q|
        id = q["id"].to_s
        correct = normalize_answer(q["answer"])
        submitted = normalize_answer(@answers[id])
        is_correct = submitted.present? && submitted == correct
        {
          "id" => q["id"],
          "is_correct" => is_correct,
          "correct_answer" => q["answer"],
          "submitted_answer" => @answers[id].to_s
        }
      end

      score = rows.count { |r| r["is_correct"] }
      total = rows.length
      {
        status: :success,
        score: score,
        total: total,
        feedback: {
          "band_score" => estimate_band(score, total),
          "tips" => score == total ? "Excellent listening accuracy." : "Replay the transcript and focus on detail words.",
          "questions" => rows
        }
      }
    end

    private

    def normalize_answer(value)
      value.to_s.strip.upcase.gsub(/\s+/, " ")
    end

    def estimate_band(score, total)
      return 0.0 if total.zero?

      ratio = score.to_f / total
      case ratio
      when 0...0.34 then 4.5
      when 0.34...0.5 then 5.0
      when 0.5...0.67 then 5.5
      when 0.67...0.84 then 6.0
      when 0.84...0.95 then 6.5
      else 7.0
      end
    end
  end
end
