# frozen_string_literal: true

# IELTS reading question-type performance linked to the unified learning profile.
class LearningProfileReadingWeakness < ApplicationRecord
  belongs_to :learning_profile

  validates :question_type, presence: true
end
