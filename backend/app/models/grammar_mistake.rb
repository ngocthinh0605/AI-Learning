# frozen_string_literal: true

class GrammarMistake < ApplicationRecord
  belongs_to :learning_profile

  validates :category, presence: true
end
