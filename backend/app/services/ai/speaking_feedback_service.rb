# frozen_string_literal: true

module Ai
  # Strict JSON speaking analysis for Whisper transcripts (IELTS-style subscores).
  class SpeakingFeedbackService
    SYSTEM = <<~PROMPT.freeze
      You are a strict but helpful IELTS speaking coach. Respond with valid JSON only, no markdown.
      Schema keys: schema_version (number 1), input (object with transcript), corrected_sentence (string),
      errors (array of { span: {start,end}, original, type, subtype, short_explanation, severity }),
      scores (object fluency, grammar, pronunciation each 0-9 number),
      scores_rationale (object with same three keys, string values),
      superior_alternative (string),
      useful_vocabulary (array of { word, definition, example_sentence }),
      confidence (number 0-1).
    PROMPT

    # @param sentence [String] Whisper transcript
    # @return [Hash] { status: :success, data: Hash } or { status: :error, error: String }
    def self.call(sentence)
      user = <<~PROMPT.strip
        User sentence: #{sentence}

        Analyse and output the JSON object described in your instructions.
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user)
    end

    # Maps speaking feedback JSON to LearningProfileUpsertService raw_analysis shape.
    def self.to_profile_raw(data)
      errs = Array(data["errors"]).map do |e|
        {
          "category" => (e["type"] || "grammar").to_s,
          "subcategory" => (e["subtype"] || "").to_s,
          "user_fragment" => e["original"].to_s,
          "correction" => data["corrected_sentence"].to_s,
          "count_weight" => 1
        }
      end

      {
        "schema_version" => 1,
        "session_type" => "speaking",
        "ielts" => {
          "estimated_band" => avg_band(data["scores"])
        },
        "vocabulary" => { "weak_lemmas" => [] },
        "grammar" => errs,
        "speaking" => {
          "fluency" => data.dig("scores", "fluency"),
          "grammar" => data.dig("scores", "grammar"),
          "pronunciation" => data.dig("scores", "pronunciation"),
          "notes" => data["scores_rationale"].to_json
        },
        "reading" => { "weak_question_types" => [] },
        "provenance" => { "source" => "speaking_feedback_service" }
      }
    end

    def self.avg_band(scores)
      return nil unless scores.is_a?(Hash)

      vals = %w[fluency grammar pronunciation].filter_map { |k| scores[k]&.to_f }.reject(&:zero?)
      return nil if vals.empty?

      (vals.sum / vals.size).round(1)
    end
    private_class_method :avg_band
  end
end
