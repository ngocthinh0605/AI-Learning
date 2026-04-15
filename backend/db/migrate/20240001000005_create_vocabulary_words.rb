class CreateVocabularyWords < ActiveRecord::Migration[7.1]
  def change
    create_table :vocabulary_words, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :word, null: false
      t.text :definition
      t.text :context_sentence
      t.integer :mastery_level, default: 1   # 1-5 scale (SRS-style)
      t.datetime :next_review_at

      t.timestamps
    end

    add_index :vocabulary_words, [:user_id, :word], unique: true
    add_index :vocabulary_words, :next_review_at
  end
end
