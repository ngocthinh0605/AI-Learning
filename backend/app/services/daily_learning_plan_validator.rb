# frozen_string_literal: true

class DailyLearningPlanValidator
  ALLOWED_TYPES = %w[
    reading_training
    vocab_training
    inference_training
    paraphrase_training
    speaking_practice
    listening_practice
    writing_reasoning
    writing_micro_task
  ].freeze

  REQUIRED_TASK_KEYS = %w[type focus duration_minutes reason].freeze
  REQUIRED_TOP_LEVEL_KEYS = %w[summary tasks].freeze
  REQUIRED_SUMMARY_KEYS = %w[main_focus reason].freeze
  def self.call(plan:, daily_time_minutes:)
    return invalid("Plan must be a JSON object") unless plan.is_a?(Hash)
    return invalid("Plan must include only summary and tasks") unless exact_keys?(plan, REQUIRED_TOP_LEVEL_KEYS)
    return invalid("summary is required") unless plan["summary"].is_a?(Hash)
    return invalid("tasks must be an array") unless plan["tasks"].is_a?(Array)
    return invalid("summary fields are invalid") unless valid_summary?(plan["summary"])

    tasks = plan["tasks"]
    return invalid("Maximum 3 tasks allowed") if tasks.length > 3
    return invalid("At least 1 task is required") if tasks.empty?
    return invalid("Plan must include at least 2 different task types") if tasks.map { |t| t["type"] }.uniq.length < 2

    total = 0

    tasks.each_with_index do |task, idx|
      return invalid("Task #{idx + 1} must be object") unless task.is_a?(Hash)
      return invalid("Task #{idx + 1} must include only required fields") unless exact_keys?(task, REQUIRED_TASK_KEYS)

      missing = REQUIRED_TASK_KEYS.reject { |k| task.key?(k) }
      return invalid("Task #{idx + 1} missing keys: #{missing.join(', ')}") if missing.any?
      return invalid("Task #{idx + 1} has invalid type") unless ALLOWED_TYPES.include?(task["type"])
      return invalid("Task #{idx + 1} focus is required") if task["focus"].to_s.strip.empty?
      return invalid("Task #{idx + 1} reason is required") if task["reason"].to_s.strip.empty?

      minutes = task["duration_minutes"].to_i
      return invalid("Task #{idx + 1} duration_minutes must be positive") if minutes <= 0

      total += minutes
    end

    return invalid("Total duration exceeds daily limit") if total > daily_time_minutes.to_i

    { valid: true, errors: [] }
  end

  def self.invalid(message)
    { valid: false, errors: [message] }
  end

  def self.valid_summary?(summary)
    return false unless exact_keys?(summary, REQUIRED_SUMMARY_KEYS)

    REQUIRED_SUMMARY_KEYS.all? { |k| summary[k].to_s.strip.length >= 3 }
  end

  def self.exact_keys?(obj, keys)
    obj.keys.map(&:to_s).sort == keys.sort
  end
end
