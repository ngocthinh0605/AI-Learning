class CreateConversations < ActiveRecord::Migration[7.1]
  def change
    create_table :conversations, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false, default: "New Conversation"
      t.string :topic
      t.string :difficulty_level

      t.timestamps
    end

    add_index :conversations, [:user_id, :created_at]
  end
end
