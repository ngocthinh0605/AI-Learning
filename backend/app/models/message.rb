class Message < ApplicationRecord
  belongs_to :conversation

  ROLES = %w[user assistant].freeze

  validates :role, inclusion: { in: ROLES }
  validates :content, presence: true

  scope :user_messages, -> { where(role: "user") }
  scope :assistant_messages, -> { where(role: "assistant") }
  scope :chronological, -> { order(created_at: :asc) }
end
