# frozen_string_literal: true

module Ai
  # Builds a session `raw_analysis` hash for LearningProfileUpsertService from an IELTS reading attempt.
  class ReadingAttemptProfileBuilder
    # @param attempt [IeltsReadingAttempt]
    # @param eval_result [Hash] Ai::ReadingEvaluationService result-style hash with :score, :total, :feedback, :weakness_analysis
    def self.build(attempt, eval_result)
      passage = attempt.ielts_reading_passage
      questions = passage.questions
      wrong_by_type = Hash.new(0)

      questions.each do |q|
        qid = q["id"].to_s
        submitted = attempt.answers[qid].to_s.strip.upcase
        correct = q["answer"].to_s.strip.upcase
        next if submitted == correct

        wrong_by_type[q["type"].to_s] += 1
      end

      total_q = questions.size
      ratio = total_q.positive? ? (eval_result[:score].to_f / eval_result[:total].to_f) : 0.0
      est_band = (4.0 + ratio * 4.5).round(1)

      weak_types = wrong_by_type.keys
      per_type = wrong_by_type.map do |qtype, w|
        tcount = questions.count { |qq| qq["type"].to_s == qtype }
        { "question_type" => qtype, "wrong" => w, "total" => tcount }
      end

      {
        "schema_version" => 1,
        "session_id" => attempt.id,
        "session_type" => "ielts_reading",
        "ielts" => {
          "estimated_band" => est_band,
          "band_components" => {
            "reading_question_types" => weak_types.index_with do |qt|
              { "score_proxy" => [9.0 - wrong_by_type[qt] * 1.5, 3.0].max, "confidence" => 0.6 }
            end
          }
        },
        "reading" => {
          "weak_question_types" => weak_types,
          "per_type_stats" => per_type
        },
        "vocabulary" => { "weak_lemmas" => [] },
        "grammar" => [],
        "speaking" => {},
        "provenance" => { "source" => "reading_attempt_submit" }
      }
    end
  end
end
