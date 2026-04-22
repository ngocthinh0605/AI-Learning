# frozen_string_literal: true

class KbDocument < ApplicationRecord
  KINDS = %w[ielts_passage grammar_rule vocab_definition].freeze

  has_many :kb_chunks, dependent: :destroy

  validates :kind, presence: true, inclusion: { in: KINDS }
end
