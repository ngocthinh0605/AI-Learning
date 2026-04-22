# frozen_string_literal: true

# Append-only log of AI session analysis payloads; feeds LearningProfileUpsertService.
class SessionOutcome < ApplicationRecord
  belongs_to :user

  validates :session_type, presence: true
end
