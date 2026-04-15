class CreateIeltsWeaknessProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :ielts_weakness_profiles, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      # index: { unique: true } ensures one profile per user at the DB level
      t.references :user, null: false, foreign_key: true, type: :uuid, index: { unique: true }
      # Shape: { "mcq": { attempts: 12, correct: 8, rate: 0.67 }, ... }
      t.jsonb   :weakness_by_type,       null: false, default: {}
      # Shape: { "vocabulary": 5, "paraphrase": 3, ... }
      t.jsonb   :error_type_counts,      null: false, default: {}
      t.string  :recommended_difficulty, default: "band_6"
      t.integer :total_attempts,         null: false, default: 0
      t.datetime :last_updated_at

      t.timestamps
    end
  end
end
