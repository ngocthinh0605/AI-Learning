class Conversation < ApplicationRecord
  belongs_to :user
  has_many :messages, dependent: :destroy

  TOPICS = %w[Travel Business Food Technology Sports Health Education Daily\ Life].freeze

  validates :title, presence: true
  validates :topic, inclusion: { in: TOPICS, allow_blank: true }

  # Returns the last N messages for building LLM context window
  def recent_messages(limit = 10)
    messages.order(created_at: :asc).last(limit)
  end
end
