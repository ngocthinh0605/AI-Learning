class AddWordTypeToVocabularyWords < ActiveRecord::Migration[7.1]
  def change
    add_column :vocabulary_words, :word_type, :string
    add_index  :vocabulary_words, :word_type
  end
end
