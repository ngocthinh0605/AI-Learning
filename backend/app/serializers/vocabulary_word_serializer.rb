class VocabularyWordSerializer < ActiveModel::Serializer
  attributes :id, :word, :word_type, :definition, :context_sentence,
             :mastery_level, :ease_factor, :review_count,
             :consecutive_correct, :last_reviewed_at,
             :next_review_at, :created_at
end
