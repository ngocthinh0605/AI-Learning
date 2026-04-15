class CreateMessages < ActiveRecord::Migration[7.1]
  def change
    create_table :messages, id: :uuid do |t|
      t.references :conversation, null: false, foreign_key: true, type: :uuid
      t.string :role, null: false     # "user" or "assistant"
      t.text :content, null: false
      t.text :transcript_error        # Grammar correction notes from the AI
      t.float :pronunciation_score    # Whisper confidence score (0.0 - 1.0)

      t.timestamps
    end

    add_index :messages, [:conversation_id, :created_at]
    add_index :messages, :role
  end
end
