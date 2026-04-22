# 🎓 Learning English — AI-Powered English Tutor

A full-stack English learning platform that uses local AI (Ollama/Gemma) and speech recognition (Whisper) to help users improve their English through conversation practice, vocabulary building, and IELTS reading preparation.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Docker Backend (Bundler and PostgreSQL)](#docker-backend-bundler-and-postgresql)
- [Environment Variables](#environment-variables)
- [Services & Ports](#services--ports)
- [Features](#features)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Hot Reload (Development)](#hot-reload-development)
- [Sub-project READMEs](#sub-project-readmes)

---

## Overview

This platform provides three core learning modules:

| Module                 | Description                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **AI Conversation**    | Real-time voice/text chat with an AI tutor powered by Gemma LLM                                |
| **Vocabulary Builder** | Spaced-repetition flashcard system with AI-generated definitions and examples                  |
| **IELTS Reading**      | AI-generated passages with 6 question types, weakness analysis, training mode, and review mode |

All AI processing runs **locally** on your machine via Ollama — no OpenAI API keys or cloud costs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              React + Vite (port 3000)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│              Rails 7.1 API (port 3001)                      │
│   Controllers → Services → Models → PostgreSQL              │
│              ActionCable (WebSocket)                        │
└──────┬────────────────┬────────────────┬────────────────────┘
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│  PostgreSQL  │  │    Redis    │  │ Whisper Service │
│  (port 5432) │  │ (port 6379) │  │  (port 8001)   │
└─────────────┘  └─────────────┘  └────────────────┘
                                          │
                              ┌───────────▼──────────┐
                              │  Ollama (host machine) │
                              │  Gemma2:9b (port 11434)│
                              └──────────────────────┘
```

**Data flow for a conversation turn:**

1. User speaks → browser captures audio
2. Audio sent to Rails → forwarded to Whisper service → transcript returned
3. Transcript + conversation history sent to Ollama/Gemma → AI response streamed back
4. Response streamed to browser via ActionCable WebSocket

---

## Tech Stack

### Backend

| Technology             | Version | Purpose                          |
| ---------------------- | ------- | -------------------------------- |
| Ruby on Rails          | 7.1     | API framework (API mode)         |
| PostgreSQL + pgvector  | 16      | Primary database + `vector` extension (RAG) |
| neighbor               | latest  | pgvector helpers in Rails        |
| Redis                  | 7       | ActionCable pub/sub adapter      |
| Devise + devise-jwt    | latest  | Authentication + JWT tokens      |
| ActiveModelSerializers | 0.10    | JSON serialization               |
| HTTParty               | latest  | HTTP client for Ollama + Whisper |
| Puma                   | 6       | Web server                       |
| RSpec                  | 6       | Testing framework                |

### Frontend

| Technology         | Version   | Purpose                 |
| ------------------ | --------- | ----------------------- |
| React              | 18        | UI framework            |
| Vite               | 5         | Build tool + dev server |
| Tailwind CSS       | 3.4       | Utility-first styling   |
| React Router       | 6         | Client-side routing     |
| Zustand            | 4.5       | Global state management |
| Axios              | 1.6       | HTTP client             |
| @rails/actioncable | 7.1       | WebSocket client        |
| Lucide React       | 0.344     | Icon library            |
| React Hot Toast    | 2.4       | Toast notifications     |
| Vitest + MSW       | 1.3 / 2.2 | Testing + API mocking   |

### AI / ML

| Technology     | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| Ollama         | Local LLM runtime                                           |
| Gemma2:9b      | Language model (conversation, passage generation, feedback) |
| nomic-embed-text (optional) | Local embeddings for RAG (`ollama pull nomic-embed-text`) |
| OpenAI Whisper | Speech-to-text transcription                                |

### Infrastructure

| Technology              | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| Docker + Docker Compose | Container orchestration                         |
| Nginx                   | Frontend static file serving (production build) |

---

## Project Structure

```
LearningEnglishProject/
│
├── docker-compose.yml          # Orchestrates all 5 services
├── .env.example                # Root environment variable template
├── .env                        # Your actual secrets (git-ignored)
│
├── backend/                    # Rails 7.1 API — see backend/README.md
├── frontend/                   # React + Vite app — see frontend/README.md
└── whisper-service/            # Python FastAPI STT — see whisper-service/README.md
```

---

## Quick Start (Docker + Ollama on Host)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Ollama](https://ollama.ai/) installed on your **host machine** (not in Docker)
- NVIDIA GPU + up-to-date NVIDIA driver (recommended for `gemma2:9b`)
- At least 16 GB system RAM (recommended when using AI + Docker together)

### 1. Start Ollama and pull models

```bash
ollama pull gemma2:9b
# Optional — used for RAG / knowledge-base similarity (Learning Profile + `kb_chunks`)
ollama pull nomic-embed-text
```

> Smaller chat alternative: `ollama pull gemma2:2b` (faster, less accurate). Set `OLLAMA_MODEL=gemma2:2b` in `.env`.

The database container uses **`pgvector/pgvector:pg16`** so migrations can enable the `vector` extension (embeddings). If you switch from plain `postgres` and hit extension errors, reset the DB volume once (see [Docker Backend](#docker-backend-bundler-and-postgresql)).

Quick verification:

```bash
ollama --version
ollama ps
```

If `ollama ps` is empty, that is normal before your first request.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
DB_PASSWORD=choose_a_strong_password
DEVISE_JWT_SECRET_KEY=<run: ruby -e "require 'securerandom'; puts SecureRandom.hex(64)">
```

### 3. Build and start all project services

After changing `Gemfile` or `Gemfile.lock`, rebuild the backend image so installed gems match the lockfile:

```bash
docker compose build --no-cache backend
docker compose up -d
```

This starts 5 containers:

- `db` — PostgreSQL **with pgvector** (auto-creates databases; migrations run in the backend entrypoint)
- `redis` — Redis for WebSocket pub/sub
- `backend` — Rails API with hot reload
- `whisper` — Python STT microservice
- `frontend` — React app served by Nginx

Optional: start frontend hot reload in Docker (Vite):

```bash
docker compose --profile dev up -d frontend-dev
```

Then open:

```
http://localhost:5173
```

### 4. Confirm AI is using GPU (recommended)

After you send your first AI message in the app (or make a test request), run:

```bash
ollama ps
nvidia-smi
```

Expected result:

- `ollama ps` shows `gemma2:9b` with `PROCESSOR 100% GPU`
- `nvidia-smi` shows high VRAM usage while model is loaded

If it shows `100% CPU`, Ollama is not using GPU and RAM usage will be much higher.

### 5. Open the app

```
http://localhost:3000
```

Register a new account and start learning!

### Useful commands

```bash
# Rebuild backend after Gemfile / Gemfile.lock changes (recommended)
docker compose build --no-cache backend

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f backend

# Install gems inside the running container (if lockfile changed without rebuild)
docker compose exec backend bundle install

# Run Rails migrations manually
docker compose exec backend bundle exec rails db:migrate

# Open a Rails console
docker compose exec backend bundle exec rails console

# Run backend tests (override entrypoint so Rails is not started)
docker compose run --rm --entrypoint "" backend bundle exec rspec

# Run frontend tests
docker compose run --rm frontend yarn test

# Check Ollama runtime status
ollama ps

# Check GPU and VRAM usage
nvidia-smi

# Stop all services
docker compose down

# Stop and remove all data (full reset)
docker compose down -v
```

---

## Docker Backend (Bundler and PostgreSQL)

### Why `Bundler::GemNotFound` happens

The backend image runs **`bundle install`** from **`Gemfile` + `Gemfile.lock`** at build time. The repo is also **mounted** into `/app`. If the lockfile on disk asks for different gem versions than what was baked into an old image, Bundler errors until you:

1. **Rebuild:** `docker compose build --no-cache backend` then `docker compose up -d`, or  
2. **Install in the container:** `docker compose exec backend bundle install`  
3. Rely on **`bin/docker-entrypoint`**, which runs **`bundle check`** and **`bundle install`** when gems are missing.

Always commit an up-to-date **`backend/Gemfile.lock`** after changing `Gemfile`.

### PostgreSQL + pgvector

Compose uses **`pgvector/pgvector:pg16`**. Migrations run `CREATE EXTENSION vector` for embedding columns (`kb_chunks.embedding`). If you previously used plain PostgreSQL and see extension errors, remove the old volume (this **deletes local DB data**):

```bash
docker compose down
docker volume rm learningenglishproject_postgres_data   # prefix may match your project folder name
docker compose up -d
```

### One-off Rails commands

The container **entrypoint** creates databases, migrates, and starts the server. For commands like **`bundle lock`** or **`rspec`**, override the entrypoint:

```bash
docker compose run --rm --no-deps --entrypoint /usr/local/bin/bundle backend lock
docker compose run --rm --entrypoint "" backend bundle exec rspec
```

---

## Environment Variables

### Root `.env` (used by docker-compose)

| Variable                       | Default                             | Description                                                 |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------- |
| `DB_USERNAME`                  | `postgres`                          | PostgreSQL username                                         |
| `DB_PASSWORD`                | —                                   | PostgreSQL password (**required**)                          |
| `DEVISE_JWT_SECRET_KEY`        | —                                   | JWT signing secret (**required**, min 64 chars)             |
| `OLLAMA_BASE_URL`            | `http://host.docker.internal:11434` | Ollama API URL                                              |
| `OLLAMA_MODEL`               | `gemma2:9b`                         | Chat / JSON LLM model tag                                   |
| `OLLAMA_MODEL_LARGE`         | `gemma3:27b`                        | Optional larger model (e.g. sidebar switcher)               |
| `OLLAMA_EMBEDDING_MODEL`     | `nomic-embed-text`                  | Ollama embeddings model for RAG                             |
| `OLLAMA_EMBEDDING_DIMENSIONS` | `768`                              | Must match the embedding model output size                  |
| `WHISPER_MODEL`              | `base`                              | Whisper model size (`tiny`/`base`/`small`/`medium`/`large`) |
| `FRONTEND_ORIGIN`            | `http://localhost:3000`             | Allowed frontend origin(s) for CORS (comma-separated)       |

### Frontend `.env.local` (for local dev without Docker)

| Variable         | Default                     | Description               |
| ---------------- | --------------------------- | ------------------------- |
| `VITE_API_URL`   | `http://localhost:3001`     | Rails API base URL        |
| `VITE_CABLE_URL` | `ws://localhost:3001/cable` | ActionCable WebSocket URL |

---

## Services & Ports

| Service    | Port    | Description                                          |
| ---------- | ------- | ---------------------------------------------------- |
| Frontend   | `3000`  | React app (Nginx in Docker, Vite dev server locally) |
| Frontend Dev | `5173`  | Vite hot-reload container (`frontend-dev` profile)   |
| Backend    | `3001`  | Rails API + ActionCable WebSocket (`/cable`)         |
| PostgreSQL | `5432`  | Database (internal to Docker network)                |
| Redis      | `6379`  | Pub/sub broker (internal)                            |
| Whisper    | `8001`  | Speech-to-text REST API                              |
| Ollama     | `11434` | LLM inference (runs on host, not in Docker)          |

---

## Features

### 🗣️ AI Conversation Practice

- Real-time voice input via browser microphone
- Audio transcribed by Whisper (local, private)
- AI responses generated by Gemma via Ollama
- Streaming responses via ActionCable WebSocket
- Conversation history persisted per session
- Vocabulary suggestions extracted from conversations

### 📚 Vocabulary Builder

- Save words from any text (highlight-to-save in reading passages)
- AI-generated definitions, example sentences, and word type
- **Spaced Repetition System (SM-2 algorithm)** — shows cards at optimal review intervals
- Mastery tracking (1–5 levels)
- Review session with quality rating (0–5)

### 📖 IELTS Reading (Phase 1 + 2)

- **AI-generated passages** at 4 difficulty bands (Band 5–8)
- **6 IELTS question types:**
  - Multiple Choice (MCQ)
  - True / False / Not Given
  - Fill in the Blank
  - Matching Headings
  - Matching Information
  - Summary Completion
- **Answer location highlighting** — shows where in the passage the answer is
- **AI weakness analysis** — classifies errors as vocabulary/paraphrase/scanning/trap/misread
- **Practice Mode** — untimed, choose difficulty and topic
- **Mock Test Mode** — 60-minute timed test
- **Training Mode** — micro-exercises targeting your weakest skill
- **Cross-skill training alignment** — weakness-driven interventions across reading/vocab/writing/speaking support tasks
- **Review Mode** — revisit mistakes with AI explanations + similar practice questions
- **Weakness Profile** — tracks accuracy by question type over time
- **Band score estimation** and XP rewards

### Learning profile, RAG, and AI pipelines

- **Unified learning profile** — vocabulary / grammar / reading question-type weaknesses, speaking subscores, estimated band; updated from IELTS reading submits and optional APIs
- **Session outcomes** — append-only JSON blobs for analytics
- **Speaking feedback** — structured IELTS-style scores from a transcript (`POST /speaking_feedback`)
- **RAG** — `kb_documents` / `kb_chunks` with pgvector similarity; `POST /rag/retrieve` and `POST /rag/ingest`
- **Adaptive content** — LLM-generated passages + questions from band and weakness tags
- **Learning insights** — aggregated dashboard JSON from session data
- **Tutor chat (structured)** — natural reply plus optional corrections JSON
- **Sidebar quick Q&A** — streaming NDJSON to Gemma (`POST /sidebar_chat`)
- **Mistake analysis pipeline** — strict cognitive/surface error analysis (`POST /pipeline/analyze_attempt`)
- **Improvement evaluation pipeline** — strict before/after skill-change analysis (`POST /pipeline/evaluate_improvement`)
- **Cross-skill daily planner** — weakness-to-skill mapping with multi-skill task mix enforcement

---

## API Reference

### Authentication

| Method   | Path                    | Description                |
| -------- | ----------------------- | -------------------------- |
| `POST`   | `/api/v1/auth/login`    | Sign in, returns JWT token |
| `POST`   | `/api/v1/auth/register` | Create account             |
| `DELETE` | `/api/v1/auth/logout`   | Invalidate JWT token       |

All protected endpoints require: `Authorization: Bearer <token>`

### Conversations

| Method   | Path                                 | Description                    |
| -------- | ------------------------------------ | ------------------------------ |
| `GET`    | `/api/v1/conversations`              | List user's conversations      |
| `POST`   | `/api/v1/conversations`              | Create new conversation        |
| `GET`    | `/api/v1/conversations/:id`          | Get conversation with messages |
| `DELETE` | `/api/v1/conversations/:id`          | Delete conversation            |
| `GET`    | `/api/v1/conversations/:id/messages` | List messages                  |
| `POST`   | `/api/v1/conversations/:id/messages` | Send message (text or audio)   |

### Vocabulary

| Method   | Path                                  | Description                           |
| -------- | ------------------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/vocabulary_words`            | List all saved words                  |
| `POST`   | `/api/v1/vocabulary_words`            | Save a new word                       |
| `GET`    | `/api/v1/vocabulary_words/session`    | Get due words for review              |
| `PATCH`  | `/api/v1/vocabulary_words/:id`        | Update word (after review)            |
| `POST`   | `/api/v1/vocabulary_words/:id/enrich` | AI-enrich word (definition + example) |
| `DELETE` | `/api/v1/vocabulary_words/:id`        | Delete word                           |

### IELTS Reading

| Method | Path                                        | Description                    |
| ------ | ------------------------------------------- | ------------------------------ |
| `POST` | `/api/v1/ielts/reading/passages`            | Generate AI passage            |
| `POST` | `/api/v1/ielts/reading/passages/:id/submit` | Submit answers, get feedback   |
| `GET`  | `/api/v1/ielts/reading/attempts`            | List past attempts (paginated) |
| `GET`  | `/api/v1/ielts/reading/attempts/:id`        | Get single attempt             |
| `GET`  | `/api/v1/ielts/reading/attempts/:id/review` | Review mode data               |
| `GET`  | `/api/v1/ielts/reading/weakness`            | Weakness profile               |
| `GET`  | `/api/v1/ielts/reading/training`            | AI training exercises          |

### User Profile

| Method  | Path              | Description              |
| ------- | ----------------- | ------------------------ |
| `GET`   | `/api/v1/profile` | Get current user profile |
| `PATCH` | `/api/v1/profile` | Update profile           |

### Learning profile & AI utilities (all require JWT)

| Method | Path                         | Description                                      |
| ------ | ---------------------------- | ------------------------------------------------ |
| `GET`  | `/api/v1/learning_profile`   | Aggregated profile + weakness summaries          |
| `POST` | `/api/v1/session_outcomes`  | Submit `raw_analysis` JSON; merges into profile |
| `POST` | `/api/v1/speaking_feedback`  | Analyse transcript; optional `update_profile`    |
| `POST` | `/api/v1/rag/retrieve`       | Embedding search over KB chunks (`query`, `top_k`, `kinds`) |
| `POST` | `/api/v1/rag/ingest`         | Ingest curated KB text (chunks + embeddings)   |
| `POST` | `/api/v1/adaptive_content`   | Generate passage + questions from weaknesses   |
| `POST` | `/api/v1/learning_insights`  | Dashboard insights (optional `learning_data` body) |
| `POST` | `/api/v1/tutor_chat`         | Structured tutor reply (`message`, `messages`)   |
| `POST` | `/api/v1/sidebar_chat`       | Sidebar Q&A; streams `application/x-ndjson`      |

### Pipeline endpoints (all require JWT)

| Method | Path                                    | Description                                                  |
| ------ | --------------------------------------- | ------------------------------------------------------------ |
| `POST` | `/api/v1/pipeline/analyze_attempt`      | Mistake analysis from answers/passage with strict JSON shape |
| `POST` | `/api/v1/pipeline/evaluate_improvement` | Before/after training evaluation with validated delta math   |

### WebSocket

```
ws://localhost:3001/cable
```

Subscribe to `ConversationChannel` with `{ conversation_id: "..." }` to receive streamed AI responses.

---

## Database Schema

```
users
  id (uuid PK), email, encrypted_password, english_level,
  display_name, xp_points, streak_days, last_practice_date

conversations
  id (uuid PK), user_id (FK), title, topic, difficulty_level

messages
  id (uuid PK), conversation_id (FK), role, content,
  transcript_error, pronunciation_score

vocabulary_words
  id (uuid PK), user_id (FK), word, definition, context_sentence,
  word_type, mastery_level, ease_factor, review_count,
  consecutive_correct, next_review_at, last_reviewed_at

ielts_reading_passages
  id (uuid PK), user_id (FK), title, body, difficulty,
  passage_type, topic, questions (jsonb)

ielts_reading_attempts
  id (uuid PK), user_id (FK), ielts_reading_passage_id (FK),
  answers (jsonb), score, total_questions, time_taken_seconds,
  feedback (jsonb), completed_at

ielts_user_answers
  id (uuid PK), user_id (FK), ielts_reading_attempt_id (FK),
  question_id, question_type, user_answer, correct_answer,
  is_correct, time_spent_seconds, error_type, explanation, suggestion

ielts_weakness_profiles
  id (uuid PK), user_id (FK, unique), weakness_by_type (jsonb),
  error_type_counts (jsonb), recommended_difficulty,
  total_attempts, last_updated_at

jwt_denylist
  id (uuid PK), jti (unique), exp

learning_profiles
  id (uuid PK), user_id (FK, unique), ielts_band_estimate, band_confidence,
  speaking_fluency, speaking_grammar, speaking_pronunciation,
  last_session_at, profile_version, metadata (jsonb)

vocabulary_weaknesses / grammar_mistakes / learning_profile_reading_weaknesses
  Granular weakness rows keyed by learning_profile_id

session_outcomes
  id (uuid PK), user_id (FK), session_type, raw_analysis (jsonb), band_delta_hint

kb_documents / kb_chunks
  Curated KB text; chunks include embedding (vector) for RAG
```

---

## Testing

### Backend (RSpec)

The backend container entrypoint starts the web server. For tests, override the entrypoint so only RSpec runs:

```bash
# Run all tests
docker compose run --rm --entrypoint "" backend bundle exec rspec

# Run a specific file
docker compose run --rm --entrypoint "" backend bundle exec rspec spec/models/ielts_user_answer_spec.rb

# Verbose output
docker compose run --rm --entrypoint "" backend bundle exec rspec --format documentation
```

Test files are in `backend/spec/`:

- `spec/models/` — ActiveRecord model tests
- `spec/requests/` — API endpoint integration tests
- `spec/services/ai/` — AI service unit tests
- `spec/factories/` — FactoryBot test data

### Frontend (Vitest)

```bash
# Run all tests once
docker compose run --rm frontend yarn test

# Watch mode (local dev)
cd frontend && yarn test:watch
```

Test files are in `frontend/src/__tests__/`:

- `__tests__/api/` — API client function tests
- `__tests__/components/` — React component tests
- `__tests__/hooks/` — Custom hook tests
- `__tests__/mocks/` — MSW request handlers

---

## Hot Reload (Development)

**Backend** — Rails hot reload is enabled. Edit any `.rb` file and the next request automatically picks up the change. No restart needed.

> Exception: changes to `config/routes.rb`, `config/initializers/`, or `Gemfile` require `docker compose restart backend`.

**Frontend** — Vite's HMR (Hot Module Replacement) is active in dev mode. Run locally with:

```bash
cd frontend
yarn dev
```

Changes to `.jsx`/`.js`/`.css` files update the browser instantly.

If you want HMR inside Docker instead of local Node:

```bash
# Start backend + supporting services
docker compose up -d

# Start Vite dev server container (profile: dev)
docker compose --profile dev up -d frontend-dev
```

Use `http://localhost:5173` for the app in this mode.

---

## Sub-project READMEs

For deeper documentation on each service:

- [`backend/README.md`](./backend/README.md) — Rails API: models, controllers, services, AI integration
- [`frontend/README.md`](./frontend/README.md) — React app: pages, components, hooks, state management
- [`whisper-service/README.md`](./whisper-service/README.md) — Python STT microservice

---

## Implemented So Far

- IELTS Reading module (passage generation, scoring, progress/training tabs)
- IELTS Listening module MVP (AI listening set generation, answer scoring, and attempt history)
- IELTS Writing module MVP (essay rubric grading and attempt history)
- IELTS Speaking foundation (feedback API + pronunciation confidence in realtime chat)
- Dedicated IELTS Speaking page (Part 1/2/3 prompts + score breakdown + attempt review)
- Multiplayer conversation rooms MVP (room model, join/leave APIs, realtime room messages)
- Mobile app scaffold (React Native structure + API contracts + base tests)
- Unified dashboard progress view (cross-skill counts, average bands, recent trend)
- Daily learning planner (strict JSON personalized plan generation with validation)
- AI pipeline foundations (mistake analysis, training generator alignment, improvement evaluation)
- Cross-skill daily planning UX (mix breakdown in generated plan + history cards)

---

## Roadmap

- [~] IELTS Listening module - MVP shipped, audio playback and richer review pending
- [~] IELTS Writing module (AI essay grading) - MVP shipped, richer prompt packs and rewrite coaching pending
- [~] IELTS Speaking module (pronunciation scoring) - foundation + page shipped, further polish pending
- [~] User dashboard with progress charts - unified progress endpoint + cross-skill trend card shipped, advanced analytics pending
- [~] Multiplayer conversation rooms - MVP shipped, moderation/presence UX pending
- [~] Mobile app (React Native) - scaffold shipped, runtime wiring pending

## Next Focus: Bug-Fix Phase

- Stabilize API contracts and payload validation across Listening/Writing/Speaking/Rooms
- Fix realtime duplication/order edge cases in conversation and room channels
- Tighten permission checks and error states for room join/leave/post flows
- Improve UX fallback handling for empty data, loading states, and failed requests

### Bug-Fix Sprint 1 Completed

- Normalized IELTS `attempts.meta` pagination key to `total_pages` where inconsistent
- Added stricter malformed AI payload validation for Listening and Writing endpoints
- Standardized permission/error responses for room APIs with `error_code` fields

### Bug-Fix Sprint 2 Completed

- Prevented duplicate room message rendering by deduplicating client inserts by `message.id`
- Added realtime room presence signals (`room_presence`) with online count in room UI
- Added owner moderation hooks: delete room message and remove room member

### Bug-Fix Sprint 3 Completed

- Added stronger loading/error/empty states in Listening, Writing, and Rooms pages
- Added retry actions for transient failures (`Retry history`, `Retry attempts`, `Retry rooms`, `Retry last request`)
- Added resilience-focused UI tests for retry/error behavior
