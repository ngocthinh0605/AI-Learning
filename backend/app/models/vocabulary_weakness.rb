# frozen_string_literal: true

class VocabularyWeakness < ApplicationRecord
  belongs_to :learning_profile

  validates :lemma_or_concept, presence: true
end
