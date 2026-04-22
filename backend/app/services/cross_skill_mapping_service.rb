# frozen_string_literal: true

class CrossSkillMappingService
  WEAKNESS_SKILL_MAP = {
    "paraphrase_confusion" => [
      { "task_type" => "reading_training", "weight" => 0.7 },
      { "task_type" => "vocab_training", "weight" => 0.3 }
    ],
    "inference_failure" => [
      { "task_type" => "reading_training", "weight" => 0.7 },
      { "task_type" => "writing_reasoning", "weight" => 0.3 }
    ],
    "keyword_matching_bias" => [
      { "task_type" => "reading_training", "weight" => 0.7 },
      { "task_type" => "paraphrase_training", "weight" => 0.3 }
    ],
    "distractor_trap" => [
      { "task_type" => "reading_training", "weight" => 0.65 },
      { "task_type" => "speaking_practice", "weight" => 0.35 }
    ],
    "vocabulary_gap" => [
      { "task_type" => "vocab_training", "weight" => 0.7 },
      { "task_type" => "reading_training", "weight" => 0.3 }
    ],
    "misread_question" => [
      { "task_type" => "reading_training", "weight" => 0.6 },
      { "task_type" => "writing_micro_task", "weight" => 0.4 }
    ],
    "time_pressure" => [
      { "task_type" => "reading_training", "weight" => 0.6 },
      { "task_type" => "speaking_practice", "weight" => 0.4 }
    ]
  }.freeze

  def self.call(latest_mistake_analysis:)
    analysis = latest_mistake_analysis.is_a?(Hash) ? latest_mistake_analysis : {}
    errors = analysis["error_breakdown"] || {}
    prioritized = prioritize_weaknesses(errors, analysis["key_weakness"])

    mapped = prioritized.map do |weakness|
      {
        "weakness" => weakness,
        "interventions" => WEAKNESS_SKILL_MAP[weakness] || default_interventions
      }
    end

    {
      "prioritized_weaknesses" => prioritized,
      "cross_skill_map" => mapped,
      "recommended_task_mix" => aggregate_mix(mapped)
    }
  end

  def self.prioritize_weaknesses(error_breakdown, key_weakness)
    ranked = error_breakdown
      .to_h
      .sort_by { |_k, v| -v.to_i }
      .map { |k, _v| k.to_s }
      .select { |k| WEAKNESS_SKILL_MAP.key?(k) }

    ranked.unshift(key_weakness.to_s) if key_weakness.present? && WEAKNESS_SKILL_MAP.key?(key_weakness.to_s)
    ranked.uniq.first(3)
  end

  def self.aggregate_mix(mapped)
    totals = Hash.new(0.0)

    mapped.each do |entry|
      entry["interventions"].each do |intervention|
        totals[intervention["task_type"]] += intervention["weight"].to_f
      end
    end

    total_weight = totals.values.sum
    return [] if total_weight.zero?

    totals
      .map { |task_type, weight| { "task_type" => task_type, "weight" => (weight / total_weight).round(3) } }
      .sort_by { |item| -item["weight"] }
  end

  def self.default_interventions
    [
      { "task_type" => "reading_training", "weight" => 0.7 },
      { "task_type" => "vocab_training", "weight" => 0.3 }
    ]
  end
end
