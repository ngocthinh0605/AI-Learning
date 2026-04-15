class IeltsWeaknessProfile < ApplicationRecord
  belongs_to :user

  DIFFICULTIES = %w[band_5 band_6 band_7 band_8].freeze

  validates :recommended_difficulty, inclusion: { in: DIFFICULTIES }

  # Rebuilds the weakness profile from all of the user's answer history.
  # Called after every attempt submission.
  #
  # Reason: recalculating from scratch (rather than incrementally) keeps the
  # logic simple and ensures the profile is always consistent with the DB.
  def self.upsert_for_user!(user)
    answers = IeltsUserAnswer.where(user: user)

    weakness_by_type   = {}
    error_type_counts  = {}
    total_attempts     = IeltsReadingAttempt.completed.where(user: user).count

    IeltsUserAnswer::QUESTION_TYPES.each do |qt|
      typed = answers.by_type(qt)
      next if typed.empty?

      total   = typed.count
      correct = typed.correct.count
      rate    = (correct.to_f / total).round(3)

      weakness_by_type[qt] = {
        "attempts" => total,
        "correct"  => correct,
        "rate"     => rate
      }
    end

    IeltsUserAnswer::ERROR_TYPES.each do |et|
      count = answers.by_error(et).count
      error_type_counts[et] = count if count > 0
    end

    profile = find_or_initialize_by(user: user)
    profile.assign_attributes(
      weakness_by_type:       weakness_by_type,
      error_type_counts:      error_type_counts,
      recommended_difficulty: recommend_difficulty(weakness_by_type),
      total_attempts:         total_attempts,
      last_updated_at:        Time.current
    )
    profile.save!
    profile
  end

  # Returns the weakest question type (lowest correct rate) or nil.
  def weakest_type
    return nil if weakness_by_type.blank?

    weakness_by_type
      .min_by { |_, v| v["rate"].to_f }
      &.first
  end

  # Returns sorted list of types from weakest to strongest.
  def ranked_weaknesses
    weakness_by_type
      .sort_by { |_, v| v["rate"].to_f }
      .map { |type, stats| { type: type, rate: stats["rate"], attempts: stats["attempts"] } }
  end

  private_class_method def self.recommend_difficulty(weakness_by_type)
    return "band_6" if weakness_by_type.blank?

    avg_rate = weakness_by_type.values.sum { |v| v["rate"].to_f } / weakness_by_type.size
    case avg_rate
    when 0...0.5  then "band_5"
    when 0.5...0.7 then "band_6"
    when 0.7...0.85 then "band_7"
    else "band_8"
    end
  end
end
