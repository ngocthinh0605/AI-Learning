class IeltsReadingPassage < ApplicationRecord
  belongs_to :user
  has_many :ielts_reading_attempts, dependent: :destroy

  DIFFICULTIES  = %w[band_5 band_6 band_7 band_8].freeze
  PASSAGE_TYPES = %w[academic general].freeze

  validates :title,        presence: true
  validates :body,         presence: true
  validates :difficulty,   inclusion: { in: DIFFICULTIES }
  validates :passage_type, inclusion: { in: PASSAGE_TYPES }
  validates :questions,    presence: true

  # Convenience: number of questions stored in the jsonb array
  def question_count
    questions.length
  end
end
