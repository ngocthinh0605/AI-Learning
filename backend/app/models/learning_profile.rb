# frozen_string_literal: true

# Aggregate learning memory for a user: band estimate, speaking subscores, and links to weakness rows.
class LearningProfile < ApplicationRecord
  belongs_to :user
  has_many :vocabulary_weaknesses, dependent: :destroy
  has_many :grammar_mistakes, dependent: :destroy
  has_many :learning_profile_reading_weaknesses, dependent: :destroy

  validates :profile_version, numericality: { only_integer: true, greater_than: 0 }
end
