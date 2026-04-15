class CreateIeltsReadingAttempts < ActiveRecord::Migration[7.1]
  def change
    create_table :ielts_reading_attempts, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user,    null: false, foreign_key: true, type: :uuid
      t.references :ielts_reading_passage, null: false, foreign_key: true, type: :uuid
      # User's submitted answers: { "1" => "A", "2" => "TRUE", ... }
      t.jsonb    :answers,           null: false, default: {}
      t.integer  :score,             null: false, default: 0
      t.integer  :total_questions,   null: false, default: 0
      t.integer  :time_taken_seconds
      # Per-question feedback + overall band score from AI evaluation
      t.jsonb    :feedback,          null: false, default: {}
      t.datetime :completed_at

      t.timestamps
    end

    # Reason: t.references already creates an index on ielts_reading_passage_id,
    # so only the composite index needs to be added manually.
    add_index :ielts_reading_attempts, [:user_id, :created_at]
  end
end
