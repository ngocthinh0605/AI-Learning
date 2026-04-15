class AddSm2FieldsToVocabularyWords < ActiveRecord::Migration[7.1]
  def change
    add_column :vocabulary_words, :ease_factor,          :float,   default: 2.5,  null: false
    add_column :vocabulary_words, :review_count,         :integer, default: 0,    null: false
    add_column :vocabulary_words, :consecutive_correct,  :integer, default: 0,    null: false
    add_column :vocabulary_words, :last_reviewed_at,     :datetime
  end
end
