# frozen_string_literal: true

# Learning profile (memory core), session outcomes, and RAG knowledge base chunks.
# Requires PostgreSQL extension `vector` (pgvector).
class CreateLearningProfileSystemAndKb < ActiveRecord::Migration[7.1]
  def up
    enable_extension "vector" unless extension_enabled?("vector")

    create_table :learning_profiles, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :user_id, null: false
      t.decimal :ielts_band_estimate, precision: 3, scale: 1
      t.decimal :band_confidence, precision: 3, scale: 2
      t.decimal :speaking_fluency, precision: 3, scale: 1
      t.decimal :speaking_grammar, precision: 3, scale: 1
      t.decimal :speaking_pronunciation, precision: 3, scale: 1
      t.datetime :last_session_at
      t.integer :profile_version, default: 1, null: false
      t.jsonb :metadata, default: {}, null: false
      t.timestamps
    end
    add_index :learning_profiles, :user_id, unique: true
    add_foreign_key :learning_profiles, :users

    create_table :vocabulary_weaknesses, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :learning_profile_id, null: false
      t.string :lemma_or_concept, null: false
      t.string :topic_tag
      t.integer :miss_count, default: 0, null: false
      t.datetime :last_seen_at
      t.float :severity_score, default: 0.0, null: false
      t.timestamps
    end
    add_index :vocabulary_weaknesses, %i[learning_profile_id lemma_or_concept], unique: true,
      name: "index_vocab_weak_on_profile_and_lemma"
    add_foreign_key :vocabulary_weaknesses, :learning_profiles

    create_table :grammar_mistakes, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :learning_profile_id, null: false
      t.string :category, null: false
      # Reason: empty string instead of NULL so the unique index applies consistently.
      t.string :subcategory, default: "", null: false
      t.text :example_snippet
      t.integer :occurrence_count, default: 0, null: false
      t.datetime :last_seen_at
      t.timestamps
    end
    add_index :grammar_mistakes, %i[learning_profile_id category subcategory], unique: true,
      name: "index_grammar_mistakes_unique"
    add_foreign_key :grammar_mistakes, :learning_profiles

    create_table :learning_profile_reading_weaknesses, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :learning_profile_id, null: false
      t.string :question_type, null: false
      t.decimal :error_rate, precision: 5, scale: 4, default: 0, null: false
      t.integer :attempts, default: 0, null: false
      t.datetime :last_updated_at
      t.timestamps
    end
    add_index :learning_profile_reading_weaknesses, %i[learning_profile_id question_type], unique: true,
      name: "index_lprw_profile_qtype"
    add_foreign_key :learning_profile_reading_weaknesses, :learning_profiles

    create_table :session_outcomes, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :user_id, null: false
      t.string :session_type, null: false
      t.jsonb :raw_analysis, default: {}, null: false
      t.decimal :band_delta_hint, precision: 3, scale: 2
      t.timestamps
    end
    add_index :session_outcomes, %i[user_id created_at]
    add_foreign_key :session_outcomes, :users

    create_table :kb_documents, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.string :kind, null: false
      t.string :title
      t.text :body
      t.string :source
      t.jsonb :metadata, default: {}, null: false
      t.timestamps
    end
    add_index :kb_documents, :kind

    create_table :kb_chunks, id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
      t.uuid :kb_document_id, null: false
      t.integer :chunk_index, default: 0, null: false
      t.text :content, null: false
      t.jsonb :metadata, default: {}, null: false
      t.timestamps
    end
    add_foreign_key :kb_chunks, :kb_documents
    add_index :kb_chunks, %i[kb_document_id chunk_index]

    execute "ALTER TABLE kb_chunks ADD COLUMN embedding vector(768)"
    # Reason: similarity search; omit IVFFLAT/HNSW until data exists — add in production after bulk ingest.
  end

  def down
    drop_table :kb_chunks
    drop_table :kb_documents
    drop_table :session_outcomes
    drop_table :learning_profile_reading_weaknesses
    drop_table :grammar_mistakes
    drop_table :vocabulary_weaknesses
    drop_table :learning_profiles
    # Reason: do not disable vector extension — other DBs may share it.
  end
end
