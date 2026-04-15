class IeltsUserAnswer < ApplicationRecord
  belongs_to :user
  belongs_to :ielts_reading_attempt

  ERROR_TYPES = %w[vocabulary paraphrase scanning trap misread].freeze
  QUESTION_TYPES = %w[mcq true_false_not_given fill_blank matching_headings
                      matching_information summary_completion].freeze

  validates :question_id,    presence: true
  validates :question_type,  inclusion: { in: QUESTION_TYPES }
  validates :correct_answer, presence: true
  validates :error_type,     inclusion: { in: ERROR_TYPES }, allow_nil: true

  scope :wrong,           -> { where(is_correct: false) }
  scope :correct,         -> { where(is_correct: true) }
  scope :by_type,         ->(type) { where(question_type: type) }
  scope :by_error,        ->(err)  { where(error_type: err) }
  scope :for_attempt,     ->(id)   { where(ielts_reading_attempt_id: id) }
end
