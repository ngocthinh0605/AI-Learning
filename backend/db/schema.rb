# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_04_22_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"
  enable_extension "vector"

  create_table "conversations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "title", default: "New Conversation", null: false
    t.string "topic"
    t.string "difficulty_level"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "created_at"], name: "index_conversations_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "grammar_mistakes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "learning_profile_id", null: false
    t.string "category", null: false
    t.string "subcategory", default: "", null: false
    t.text "example_snippet"
    t.integer "occurrence_count", default: 0, null: false
    t.datetime "last_seen_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["learning_profile_id", "category", "subcategory"], name: "index_grammar_mistakes_unique", unique: true
  end

  create_table "ielts_reading_attempts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "ielts_reading_passage_id", null: false
    t.jsonb "answers", default: {}, null: false
    t.integer "score", default: 0, null: false
    t.integer "total_questions", default: 0, null: false
    t.integer "time_taken_seconds"
    t.jsonb "feedback", default: {}, null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ielts_reading_passage_id"], name: "index_ielts_reading_attempts_on_ielts_reading_passage_id"
    t.index ["user_id", "created_at"], name: "index_ielts_reading_attempts_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_ielts_reading_attempts_on_user_id"
  end

  create_table "ielts_reading_passages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "title", null: false
    t.text "body", null: false
    t.string "difficulty", default: "band_6", null: false
    t.string "passage_type", default: "academic", null: false
    t.string "topic"
    t.jsonb "questions", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["difficulty"], name: "index_ielts_reading_passages_on_difficulty"
    t.index ["user_id", "created_at"], name: "index_ielts_reading_passages_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_ielts_reading_passages_on_user_id"
  end

  create_table "ielts_user_answers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "ielts_reading_attempt_id", null: false
    t.integer "question_id", null: false
    t.string "question_type", null: false
    t.string "user_answer"
    t.string "correct_answer", null: false
    t.boolean "is_correct", default: false, null: false
    t.integer "time_spent_seconds"
    t.string "error_type"
    t.text "explanation"
    t.text "suggestion"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["error_type"], name: "index_ielts_user_answers_on_error_type"
    t.index ["ielts_reading_attempt_id"], name: "index_ielts_user_answers_on_ielts_reading_attempt_id"
    t.index ["user_id", "is_correct"], name: "index_ielts_user_answers_on_user_id_and_is_correct"
    t.index ["user_id", "question_type"], name: "index_ielts_user_answers_on_user_id_and_question_type"
    t.index ["user_id"], name: "index_ielts_user_answers_on_user_id"
  end

  create_table "ielts_weakness_profiles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.jsonb "weakness_by_type", default: {}, null: false
    t.jsonb "error_type_counts", default: {}, null: false
    t.string "recommended_difficulty", default: "band_6"
    t.integer "total_attempts", default: 0, null: false
    t.datetime "last_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_ielts_weakness_profiles_on_user_id", unique: true
  end

  create_table "jwt_denylist", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.index ["jti"], name: "index_jwt_denylist_on_jti", unique: true
  end

  create_table "kb_chunks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "kb_document_id", null: false
    t.integer "chunk_index", default: 0, null: false
    t.text "content", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.vector "embedding", limit: 768
    t.index ["kb_document_id", "chunk_index"], name: "index_kb_chunks_on_kb_document_id_and_chunk_index"
  end

  create_table "kb_documents", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "kind", null: false
    t.string "title"
    t.text "body"
    t.string "source"
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["kind"], name: "index_kb_documents_on_kind"
  end

  create_table "learning_profile_reading_weaknesses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "learning_profile_id", null: false
    t.string "question_type", null: false
    t.decimal "error_rate", precision: 5, scale: 4, default: "0.0", null: false
    t.integer "attempts", default: 0, null: false
    t.datetime "last_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["learning_profile_id", "question_type"], name: "index_lprw_profile_qtype", unique: true
  end

  create_table "learning_profiles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.decimal "ielts_band_estimate", precision: 3, scale: 1
    t.decimal "band_confidence", precision: 3, scale: 2
    t.decimal "speaking_fluency", precision: 3, scale: 1
    t.decimal "speaking_grammar", precision: 3, scale: 1
    t.decimal "speaking_pronunciation", precision: 3, scale: 1
    t.datetime "last_session_at"
    t.integer "profile_version", default: 1, null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_learning_profiles_on_user_id", unique: true
  end

  create_table "messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "conversation_id", null: false
    t.string "role", null: false
    t.text "content", null: false
    t.text "transcript_error"
    t.float "pronunciation_score"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
    t.index ["role"], name: "index_messages_on_role"
  end

  create_table "room_memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "room_id", null: false
    t.uuid "user_id", null: false
    t.string "role", default: "member", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["room_id", "user_id"], name: "index_room_memberships_on_room_id_and_user_id", unique: true
  end

  create_table "room_messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "room_id", null: false
    t.uuid "user_id", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["room_id", "created_at"], name: "index_room_messages_on_room_id_and_created_at"
  end

  create_table "rooms", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.uuid "owner_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_rooms_on_name"
  end

  create_table "session_outcomes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "session_type", null: false
    t.jsonb "raw_analysis", default: {}, null: false
    t.decimal "band_delta_hint", precision: 3, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "created_at"], name: "index_session_outcomes_on_user_id_and_created_at"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "english_level", default: "A1"
    t.string "display_name"
    t.integer "xp_points", default: 0
    t.integer "streak_days", default: 0
    t.date "last_practice_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "vocabulary_weaknesses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "learning_profile_id", null: false
    t.string "lemma_or_concept", null: false
    t.string "topic_tag"
    t.integer "miss_count", default: 0, null: false
    t.datetime "last_seen_at"
    t.float "severity_score", default: 0.0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["learning_profile_id", "lemma_or_concept"], name: "index_vocab_weak_on_profile_and_lemma", unique: true
  end

  create_table "vocabulary_words", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "word", null: false
    t.text "definition"
    t.text "context_sentence"
    t.integer "mastery_level", default: 1
    t.datetime "next_review_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "word_type"
    t.float "ease_factor", default: 2.5, null: false
    t.integer "review_count", default: 0, null: false
    t.integer "consecutive_correct", default: 0, null: false
    t.datetime "last_reviewed_at"
    t.index ["next_review_at"], name: "index_vocabulary_words_on_next_review_at"
    t.index ["user_id", "word"], name: "index_vocabulary_words_on_user_id_and_word", unique: true
    t.index ["user_id"], name: "index_vocabulary_words_on_user_id"
    t.index ["word_type"], name: "index_vocabulary_words_on_word_type"
  end

  add_foreign_key "conversations", "users"
  add_foreign_key "grammar_mistakes", "learning_profiles"
  add_foreign_key "ielts_reading_attempts", "ielts_reading_passages"
  add_foreign_key "ielts_reading_attempts", "users"
  add_foreign_key "ielts_reading_passages", "users"
  add_foreign_key "ielts_user_answers", "ielts_reading_attempts"
  add_foreign_key "ielts_user_answers", "users"
  add_foreign_key "ielts_weakness_profiles", "users"
  add_foreign_key "kb_chunks", "kb_documents"
  add_foreign_key "learning_profile_reading_weaknesses", "learning_profiles"
  add_foreign_key "learning_profiles", "users"
  add_foreign_key "messages", "conversations"
  add_foreign_key "room_memberships", "rooms"
  add_foreign_key "room_memberships", "users"
  add_foreign_key "room_messages", "rooms"
  add_foreign_key "room_messages", "users"
  add_foreign_key "rooms", "users", column: "owner_id"
  add_foreign_key "session_outcomes", "users"
  add_foreign_key "vocabulary_weaknesses", "learning_profiles"
  add_foreign_key "vocabulary_words", "users"
end
