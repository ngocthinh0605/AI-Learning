# Backend — Rails 7.1 API

The Rails API backend powers all business logic, database access, AI service integration, and real-time WebSocket communication.

---

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Models & Database](#models--database)
- [Controllers & Routes](#controllers--routes)
- [AI Services](#ai-services)
- [Serializers](#serializers)
- [Authentication](#authentication)
- [Real-time (ActionCable)](#real-time-actioncable)
- [Configuration](#configuration)
- [Docker image & Bundler](#docker-image--bundler)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Migrations](#migrations)
- [Testing](#testing)

---

## Overview

- **Framework:** Ruby on Rails 7.1 (API mode — no views, no asset pipeline)
- **Database:** PostgreSQL 16 with UUID primary keys; **`vector`** extension (pgvector) for RAG embeddings
- **Gems:** `neighbor` for pgvector-backed similarity on `KbChunk`
- **Auth:** Devise + devise-jwt (stateless JWT, tokens stored on the client)
- **AI:** HTTParty calls to Ollama (local LLM) and Whisper (local STT)
- **Real-time:** ActionCable over Redis for streaming AI responses
- **Serialization:** ActiveModelSerializers (AMS) for consistent JSON responses

---

## Folder Structure

```
backend/
│
├── Dockerfile                  # Copies Gemfile + Gemfile.lock, bundle install, then app
├── Gemfile                     # Ruby dependencies
├── Gemfile.lock                # Locked dependency versions
├── Rakefile                    # Rails task runner
├── config.ru                   # Rack entry point
├── .env.example                # Environment variable template for local dev
│
├── bin/
│   ├── docker-entrypoint       # bundle check/install → create DBs → migrate → server
│   ├── rails                   # Rails CLI
│   ├── rake                    # Rake CLI
│   ├── bundle                  # Bundler CLI
│   └── setup                   # Local dev setup script
│
├── app/
│   ├── channels/               # ActionCable WebSocket channels
│   │   ├── application_cable/
│   │   │   ├── connection.rb   # Authenticates WebSocket connections via JWT
│   │   │   └── channel.rb      # Base channel class
│   │   └── conversation_channel.rb  # Streams AI responses to the browser
│   │
│   ├── controllers/
│   │   ├── application_controller.rb   # Base: JWT auth, error handling
│   │   └── api/v1/
│   │       ├── ai_controller.rb            # POST /ai/transcribe_and_respond
│   │       ├── conversations_controller.rb # CRUD for conversations
│   │       ├── messages_controller.rb      # List + create messages
│   │       ├── users_controller.rb         # Profile get/update
│   │       ├── vocabulary_words_controller.rb  # Vocabulary CRUD + review session
│   │       ├── auth/
│   │       │   ├── sessions_controller.rb      # Login / logout
│   │       │   └── registrations_controller.rb # Register
│   │       └── ielts/
│   │           └── reading_controller.rb   # All IELTS Reading endpoints
│   │
│   ├── models/
│   │   ├── application_record.rb       # Base model (UUID PK by default)
│   │   ├── user.rb                     # User account + associations
│   │   ├── conversation.rb             # Chat session
│   │   ├── message.rb                  # Individual chat message
│   │   ├── vocabulary_word.rb          # Saved word + SM-2 SRS fields
│   │   ├── jwt_denylist.rb             # Revoked JWT tokens
│   │   ├── ielts_reading_passage.rb    # AI-generated reading passage
│   │   ├── ielts_reading_attempt.rb    # User's attempt at a passage
│   │   ├── ielts_user_answer.rb        # Per-question answer row
│   │   └── ielts_weakness_profile.rb   # Aggregated weakness stats per user
│   │
│   ├── serializers/
│   │   ├── user_serializer.rb
│   │   ├── conversation_serializer.rb
│   │   ├── message_serializer.rb
│   │   ├── vocabulary_word_serializer.rb
│   │   ├── ielts_reading_passage_serializer.rb
│   │   ├── ielts_reading_attempt_serializer.rb
│   │   ├── ielts_user_answer_serializer.rb
│   │   └── ielts_weakness_profile_serializer.rb
│   │
│   └── services/ai/            # All AI/LLM integration logic
│       ├── gemma_service.rb            # Single-turn Ollama chat
│       ├── gemma_streaming_service.rb  # Streaming Ollama chat (ActionCable)
│       ├── whisper_service.rb          # Audio → transcript via Whisper microservice
│       ├── vocab_enrich_service.rb     # AI word definition + example sentence
│       ├── reading_passage_service.rb  # Generate IELTS passage + questions
│       ├── reading_evaluation_service.rb  # Score answers + AI feedback
│       ├── weakness_analysis_service.rb   # Classify wrong answers by error type
│       ├── training_exercise_service.rb   # Generate micro-exercises
│       └── similar_question_service.rb    # Generate similar questions for review
│       ├── llm_json_completion.rb         # Ollama JSON-only completions
│       ├── embedding_service.rb           # Ollama /api/embeddings
│       ├── retrieval_service.rb           # pgvector nearest-neighbor search
│       ├── knowledge_ingest_service.rb    # Chunk + embed KB documents
│       ├── rag_prompt_builder.rb          # Format RAG context for prompts
│       ├── speaking_feedback_service.rb   # IELTS-style transcript analysis JSON
│       ├── adaptive_content_generator_service.rb
│       ├── analytics_insight_service.rb
│       ├── tutor_structured_chat_service.rb
│       └── reading_attempt_profile_builder.rb  # Build session JSON from reading submit
│
├── config/
│   ├── routes.rb               # All API routes
│   ├── application.rb          # App config (middleware, generators)
│   ├── database.yml            # PostgreSQL connection config
│   ├── puma.rb                 # Puma web server config (port 3001)
│   ├── cable.yml               # ActionCable adapter (Redis)
│   ├── environments/
│   │   ├── development.rb      # Dev: enable_reloading=true, verbose logs
│   │   ├── test.rb             # Test: disable caching, raise on errors
│   │   └── production.rb       # Production: eager_load, caching
│   └── initializers/
│       ├── cors.rb             # CORS: allow frontend origin
│       ├── devise.rb           # Devise + JWT config
│       ├── 00_devise_orm.rb    # Load Devise ActiveRecord ORM
│       └── action_cable.rb     # ActionCable allowed origins
│
├── db/
│   ├── schema.rb               # Auto-generated current DB schema
│   └── migrate/                # Ordered migration files
│       ├── 20240001000001_create_users.rb
│       ├── 20240001000002_create_jwt_denylist.rb
│       ├── 20240001000003_create_conversations.rb
│       ├── 20240001000004_create_messages.rb
│       ├── 20240001000005_create_vocabulary_words.rb
│       ├── 20260414000001_add_word_type_to_vocabulary_words.rb
│       ├── 20260414000002_add_sm2_fields_to_vocabulary_words.rb
│       ├── 20260414000003_create_ielts_reading_passages.rb
│       ├── 20260414000004_create_ielts_reading_attempts.rb
│       ├── 20260414000005_create_ielts_user_answers.rb
│       └── 20260414000006_create_ielts_weakness_profiles.rb
│
├── spec/                       # RSpec test suite
│   ├── spec_helper.rb          # RSpec global config
│   ├── rails_helper.rb         # Rails + FactoryBot + DatabaseCleaner setup
│   ├── support/
│   │   └── auth_helpers.rb     # Helper: generate JWT auth headers for tests
│   ├── factories/              # FactoryBot test data factories
│   ├── models/                 # Model unit tests
│   ├── requests/               # API integration tests (full HTTP stack)
│   └── services/ai/            # AI service unit tests (Ollama/Whisper stubbed)
│
└── log/
    └── development.log         # Rails request logs (gitignored)
```

---

## Models & Database

All tables use **UUID primary keys** (`gen_random_uuid()`). Foreign keys are enforced at the database level.

### `User`
Central model. Owns all other resources.

| Field | Type | Notes |
|-------|------|-------|
| `email` | string | Unique, used for login |
| `encrypted_password` | string | Bcrypt hash (Devise) |
| `english_level` | string | A1–C2 |
| `display_name` | string | Optional display name |
| `xp_points` | integer | Gamification points |
| `streak_days` | integer | Consecutive practice days |
| `last_practice_date` | date | For streak calculation |

**Associations:** `has_many conversations`, `has_many vocabulary_words`, `has_many ielts_reading_passages`, `has_many ielts_reading_attempts`, `has_many ielts_user_answers`, `has_one ielts_weakness_profile`, `has_one learning_profile`, `has_many session_outcomes`

### `Conversation` + `Message`
A `Conversation` is a chat session with a topic and difficulty. `Message` rows store each turn with `role` (user/assistant) and `content`. Messages also store `pronunciation_score` and `transcript_error` from Whisper.

### `VocabularyWord`
Stores a saved word with SM-2 spaced repetition fields:
- `ease_factor` — how easy the word is (default 2.5, adjusts with reviews)
- `review_count` — total reviews
- `consecutive_correct` — streak of correct answers
- `next_review_at` — when to show the card next
- `mastery_level` — 1–5 display level

### `IeltsReadingPassage`
AI-generated passage stored with its questions as a **JSONB array**. Each question object includes:
```json
{
  "id": 1,
  "type": "mcq",
  "question": "...",
  "options": ["A. ...", "B. ..."],
  "answer": "A",
  "location_in_passage": "verbatim phrase from passage near the answer"
}
```
Supported `type` values: `mcq`, `true_false_not_given`, `fill_blank`, `matching_headings`, `matching_information`, `summary_completion`

### `IeltsReadingAttempt`
Records a user's attempt at a passage. Stores:
- `answers` (jsonb) — `{ "1": "A", "2": "TRUE" }`
- `feedback` (jsonb) — AI-generated band score, tips, per-question explanations
- `score` / `total_questions` / `time_taken_seconds`

### `IeltsUserAnswer`
One row per question per attempt. Enables querying by question type, error type, and correctness — powers the weakness profile.

| Field | Notes |
|-------|-------|
| `question_type` | `mcq`, `true_false_not_given`, etc. |
| `is_correct` | boolean |
| `error_type` | AI-classified: `vocabulary`, `paraphrase`, `scanning`, `trap`, `misread` |
| `explanation` | Why the answer was wrong |
| `suggestion` | How to improve |

### `IeltsWeaknessProfile`
One row per user (unique constraint on `user_id`). Updated after every attempt via `IeltsWeaknessProfile.upsert_for_user!(user)`.

```json
{
  "weakness_by_type": {
    "mcq": { "attempts": 20, "correct": 15, "rate": 0.75 },
    "true_false_not_given": { "attempts": 16, "correct": 8, "rate": 0.5 }
  },
  "error_type_counts": { "paraphrase": 5, "trap": 3 },
  "recommended_difficulty": "band_6"
}
```

---

## Controllers & Routes

### Route overview

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
DELETE /api/v1/auth/logout

GET    /api/v1/profile
PATCH  /api/v1/profile

GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/:id
DELETE /api/v1/conversations/:id
GET    /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/messages

GET    /api/v1/vocabulary_words
POST   /api/v1/vocabulary_words
GET    /api/v1/vocabulary_words/:id
PATCH  /api/v1/vocabulary_words/:id
DELETE /api/v1/vocabulary_words/:id
GET    /api/v1/vocabulary_words/session
POST   /api/v1/vocabulary_words/:id/enrich

POST   /api/v1/ai/transcribe_and_respond

POST   /api/v1/ielts/reading/passages
POST   /api/v1/ielts/reading/passages/:id/submit
GET    /api/v1/ielts/reading/attempts
GET    /api/v1/ielts/reading/attempts/:id
GET    /api/v1/ielts/reading/attempts/:id/review
GET    /api/v1/ielts/reading/weakness
GET    /api/v1/ielts/reading/training

POST   /api/v1/sidebar_chat

GET    /api/v1/learning_profile
POST   /api/v1/session_outcomes
POST   /api/v1/speaking_feedback
POST   /api/v1/rag/retrieve
POST   /api/v1/rag/ingest
POST   /api/v1/adaptive_content
POST   /api/v1/learning_insights
POST   /api/v1/tutor_chat
```

### `ApplicationController`
- Authenticates every request via `authenticate_user!` (Devise JWT)
- Returns `401 Unauthorized` for missing/invalid tokens
- Sets `current_user` for all child controllers

### `ReadingController`
Uses `wrap_parameters false` to prevent Rails from nesting JSON body params under `:reading`. All actions are kept thin — business logic lives in AI services.

---

## AI Services

All services live in `app/services/ai/` and follow the same pattern:
- Include `HTTParty`
- `base_uri` points to `OLLAMA_BASE_URL` or `WHISPER_SERVICE_URL`
- `call` method returns `{ status: :success, ... }` or `{ status: :error, error: "..." }`
- Always include a fallback for when Ollama is unavailable

### `Ai::GemmaService`
Single-turn chat completion. Sends conversation history to Ollama and returns the full response.

### `Ai::GemmaStreamingService`
Same as above but streams the response token-by-token via ActionCable to the browser.

### `Ai::WhisperService`
Sends audio file (multipart) to the Whisper microservice at `http://whisper:8001/transcribe`. Returns `{ transcript: "..." }`.

### `Ai::VocabEnrichService`
Given a word, asks Gemma for: definition, example sentence, word type (noun/verb/etc.), and pronunciation tip.

### `Ai::ReadingPassageService`
Generates a complete IELTS reading passage with 13 questions across 6 types. The prompt specifies exact JSON structure including `location_in_passage` for each question.

### `Ai::ReadingEvaluationService`
1. Scores answers locally (no LLM needed for correctness)
2. Calls `WeaknessAnalysisService` for wrong answers
3. Calls Ollama for band score estimation and tips
4. Returns merged result with `error_type` per wrong answer

### `Ai::WeaknessAnalysisService`
Given wrong answers + passage text, asks Ollama to classify each error as:
- `vocabulary` — didn't know a key word
- `paraphrase` — missed that the question paraphrased the passage
- `scanning` — looked in the wrong part
- `trap` — T/F/NG trap or MCQ distractor
- `misread` — misunderstood the question

Falls back to rule-based classification if Ollama is unavailable.

### `Ai::TrainingExerciseService`
Given a weakness type + passage snippet, generates micro-exercises:
- `paraphrase_match` — match a sentence to its paraphrase
- `keyword_spotting` — identify key words in a question
- `scanning_practice` — locate specific information
- `main_idea` — identify the main idea of a paragraph

### `Ai::SimilarQuestionService`
Given wrong questions + passage, generates new questions of the same type testing the same skill. Used in Review Mode.

### Learning profile & RAG (summary)

- **`LearningProfileUpsertService`** — merges session `raw_analysis` JSON into `learning_profiles` and related weakness tables; optionally logs `session_outcomes`.
- **`Ai::ReadingAttemptProfileBuilder`** — builds analysis payload after an IELTS reading submit; wired from `ReadingController#submit`.
- **`Ai::LlmJsonCompletion`** — single-turn Ollama chat expecting JSON output (speaking feedback, adaptive content, insights, tutor structured replies).
- **`Ai::EmbeddingService` / `Ai::RetrievalService` / `Ai::KnowledgeIngestService`** — embeddings via Ollama, similarity search with `neighbor`, ingest for `kb_documents` / `kb_chunks`.

---

## Serializers

Each serializer controls exactly which fields are included in API responses. Associations are included where needed (e.g. `IeltsReadingAttemptSerializer` includes the passage title).

---

## Authentication

Uses **Devise + devise-jwt**:

1. `POST /api/v1/auth/login` → returns JWT in `Authorization: Bearer <token>` response header
2. Client stores token in `localStorage`
3. Every subsequent request sends `Authorization: Bearer <token>` header
4. `ApplicationController` calls `authenticate_user!` which validates the token
5. `POST /api/v1/auth/logout` → adds the token's `jti` to `jwt_denylist` table (token revocation)

---

## Real-time (ActionCable)

`ConversationChannel` handles streaming AI responses:

1. Frontend subscribes: `{ channel: "ConversationChannel", conversation_id: "..." }`
2. `ApplicationCable::Connection` authenticates the WebSocket via JWT query param
3. When a message is sent, `GemmaStreamingService` broadcasts each token to the channel
4. Frontend receives tokens and appends them to the streaming bubble
5. Final `{ type: "done" }` message signals completion

Redis is used as the ActionCable pub/sub adapter (configured in `config/cable.yml`).

---

## Docker image & Bundler

- The **Dockerfile** copies **`Gemfile` and `Gemfile.lock`** before `bundle install` so the image matches the lockfile (avoids `Bundler::GemNotFound` when `/app` is bind-mounted).
- **`bin/docker-entrypoint`** runs **`bundle check`** and **`bundle install`** if gems are missing (e.g. lockfile updated on the host without rebuilding).
- Rebuild after dependency changes: `docker compose build --no-cache backend`.
- Use **PostgreSQL with pgvector** in Compose (`pgvector/pgvector:pg16`); local dev needs the `vector` extension for migrations that add `kb_chunks.embedding`.

---

## Configuration

### `config/initializers/cors.rb`
Allows requests from `FRONTEND_ORIGIN` (default: `http://localhost:3000`). Exposes the `Authorization` header so the frontend can read the JWT token.

### `config/initializers/devise.rb`
Configures JWT secret key, token dispatch on sign-in, and token revocation strategy (`JwtDenylist`).

### `config/puma.rb`
- Port: `3001`
- Threads: 5 min / 5 max
- Workers: only in production (multi-process)
- Plugin: `tmp_restart` (touch `tmp/restart.txt` to restart without full rebuild)

---

## Running Locally (without Docker)

```bash
# Install dependencies
bundle install

# Set up environment
cp .env.example .env
# Edit .env with your local DB credentials

# Create and migrate database
bin/rails db:create db:migrate

# Start the server
bin/rails server -p 3001
```

Requirements: Ruby 3.2.2, PostgreSQL 16, Redis 7

---

## Migrations

Requires PostgreSQL with the **`vector`** extension (pgvector) for newer migrations.

```bash
# Run pending migrations (Docker)
docker compose exec backend bundle exec rails db:migrate

# Check migration status
docker compose exec backend bundle exec rails db:migrate:status

# Rollback last migration
docker compose exec backend bundle exec rails db:rollback

# Reset database (destroys all data)
docker compose exec backend bundle exec rails db:drop db:create db:migrate
```

---

## Testing

Tests use **RSpec** with **FactoryBot** (test data), **WebMock** (stub HTTP calls to Ollama/Whisper), and **DatabaseCleaner** (clean DB between tests).

```bash
# Run all tests
docker compose run --rm backend bundle exec rspec

# Run by type
docker compose run --rm backend bundle exec rspec spec/models/
docker compose run --rm backend bundle exec rspec spec/requests/
docker compose run --rm backend bundle exec rspec spec/services/

# Run a single file
docker compose run --rm backend bundle exec rspec spec/models/ielts_weakness_profile_spec.rb

# Verbose output
docker compose run --rm backend bundle exec rspec --format documentation
```

### Test structure

| Directory | What it tests |
|-----------|--------------|
| `spec/models/` | Validations, associations, scopes, instance methods |
| `spec/requests/api/v1/` | Full HTTP request/response cycle including auth |
| `spec/services/ai/` | AI service call/response/fallback logic |
| `spec/factories/` | FactoryBot definitions (not tests themselves) |
| `spec/support/auth_helpers.rb` | `auth_headers_for(user)` helper used in request specs |
