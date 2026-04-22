# frozen_string_literal: true

class ImprovementEvaluationValidator
  REQUIRED_TOP_LEVEL_KEYS = %w[improvement insight next_focus].freeze
  REQUIRED_IMPROVEMENT_KEYS = %w[before after delta].freeze

  def self.call(result:)
    return invalid("Result must be a JSON object") unless result.is_a?(Hash)
    return invalid("Result keys are invalid") unless exact_keys?(result, REQUIRED_TOP_LEVEL_KEYS)
    return invalid("improvement must be an object") unless result["improvement"].is_a?(Hash)
    return invalid("improvement keys are invalid") unless exact_keys?(result["improvement"], REQUIRED_IMPROVEMENT_KEYS)
    return invalid("insight must be a non-empty string") unless non_empty_string?(result["insight"])
    return invalid("next_focus must be a non-empty string") unless non_empty_string?(result["next_focus"])

    before_score = normalized_score(result["improvement"]["before"])
    after_score = normalized_score(result["improvement"]["after"])
    delta_score = normalized_score(result["improvement"]["delta"])
    return invalid("improvement scores must be numbers between 0 and 1") if [before_score, after_score, delta_score].any?(&:nil?)

    expected_delta = (after_score - before_score).round(4)
    return invalid("delta must equal after - before") unless (delta_score - expected_delta).abs <= 0.0001

    { valid: true, errors: [] }
  end

  def self.invalid(message)
    { valid: false, errors: [message] }
  end

  def self.exact_keys?(obj, keys)
    obj.keys.map(&:to_s).sort == keys.sort
  end

  def self.non_empty_string?(value)
    value.is_a?(String) && value.strip.length >= 3
  end

  def self.normalized_score(value)
    float = Float(value)
    return nil unless float >= 0.0 && float <= 1.0

    float.round(4)
  rescue StandardError
    nil
  end
end
