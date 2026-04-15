class IeltsReadingAttempt < ApplicationRecord
  belongs_to :user
  belongs_to :ielts_reading_passage

  validates :score,           presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :total_questions, presence: true, numericality: { greater_than: 0 }

  # Returns percentage score (0.0 – 100.0)
  def percentage
    return 0.0 if total_questions.zero?
    (score.to_f / total_questions * 100).round(1)
  end

  # Extracts the estimated band score from the AI feedback hash.
  # Stored as feedback["band_score"] by ReadingEvaluationService.
  def band_score
    feedback&.dig("band_score")
  end

  # Convenience: returns per-question feedback array
  def question_feedback
    feedback&.dig("questions") || []
  end

  scope :completed,       -> { where.not(completed_at: nil) }
  scope :recent_first,    -> { order(created_at: :desc) }
  scope :for_user,        ->(user) { where(user: user) }
end
