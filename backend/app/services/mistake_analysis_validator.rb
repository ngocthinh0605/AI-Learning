# frozen_string_literal: true

class MistakeAnalysisValidator
  ALLOWED_ERRORS = %w[
    vocabulary_gap
    misread_question
    time_pressure
    keyword_matching_bias
    paraphrase_confusion
    inference_failure
    distractor_trap
  ].freeze

  REQUIRED_KEYS = %w[summary error_breakdown skills key_weakness].freeze

  def self.call(result:)
    return invalid("Result must be a JSON object") unless result.is_a?(Hash)
    return invalid("Result keys are invalid") unless result.keys.map(&:to_s).sort == REQUIRED_KEYS.sort
    return invalid("summary must be a non-empty string") unless non_empty_string?(result["summary"])
    return invalid("key_weakness must be a non-empty string") unless non_empty_string?(result["key_weakness"])
    return invalid("error_breakdown must be an object") unless result["error_breakdown"].is_a?(Hash)
    return invalid("skills must be an object") unless result["skills"].is_a?(Hash)

    result["error_breakdown"].each do |k, v|
      return invalid("error_breakdown key #{k} is invalid") unless ALLOWED_ERRORS.include?(k.to_s)
      return invalid("error_breakdown value for #{k} must be non-negative integer") unless integer_like?(v) && v.to_i >= 0
    end

    result["skills"].each do |k, v|
      return invalid("skills key #{k} is invalid") if k.to_s.strip.empty?
      value = v.to_f
      return invalid("skills value for #{k} must be in range 0..1") unless value >= 0.0 && value <= 1.0
    end

    { valid: true, errors: [] }
  end

  def self.invalid(message)
    { valid: false, errors: [message] }
  end

  def self.non_empty_string?(value)
    value.is_a?(String) && value.strip.length >= 3
  end

  def self.integer_like?(value)
    Integer(value)
    true
  rescue StandardError
    false
  end
end
