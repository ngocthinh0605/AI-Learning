class CreateIeltsUserAnswers < ActiveRecord::Migration[7.1]
  def change
    create_table :ielts_user_answers, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user,                 null: false, foreign_key: true, type: :uuid
      t.references :ielts_reading_attempt, null: false, foreign_key: true, type: :uuid
      t.integer  :question_id,    null: false
      t.string   :question_type,  null: false
      t.string   :user_answer
      t.string   :correct_answer, null: false
      t.boolean  :is_correct,     null: false, default: false
      t.integer  :time_spent_seconds
      # AI-classified error category for wrong answers
      t.string   :error_type
      t.text     :explanation
      t.text     :suggestion

      t.timestamps
    end

    add_index :ielts_user_answers, [:user_id, :question_type]
    add_index :ielts_user_answers, [:user_id, :is_correct]
    add_index :ielts_user_answers, :error_type
  end
end
