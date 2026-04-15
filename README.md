# 🎓 Learning English — AI-Powered English Tutor

A full-stack English learning platform that uses local AI (Ollama/Gemma) and speech recognition (Whisper) to help users improve their English through conversation practice, vocabulary building, and IELTS reading preparation.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
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
| PostgreSQL             | 16      | Primary database                 |
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

### 1. Start Ollama and pull the AI model

```bash
ollama pull gemma2:9b
```

> Smaller alternative: `ollama pull gemma2:2b` (faster, less accurate). Set `OLLAMA_MODEL=gemma2:2b` in `.env`.

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

### 3. Start all project services

```bash
docker compose up -d
```

This starts 5 containers:

- `db` — PostgreSQL (auto-creates databases + runs migrations)
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
# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f backend

# Run Rails migrations manually
docker compose exec backend bin/rails db:migrate

# Open a Rails console
docker compose exec backend bin/rails console

# Run backend tests
docker compose run --rm backend bundle exec rspec

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

## Environment Variables

### Root `.env` (used by docker-compose)

| Variable                | Default                             | Description                                                 |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `DB_USERNAME`           | `postgres`                          | PostgreSQL username                                         |
| `DB_PASSWORD`           | —                                   | PostgreSQL password (**required**)                          |
| `DEVISE_JWT_SECRET_KEY` | —                                   | JWT signing secret (**required**, min 64 chars)             |
| `OLLAMA_BASE_URL`       | `http://host.docker.internal:11434` | Ollama API URL                                              |
| `OLLAMA_MODEL`          | `gemma2:9b`                         | Model name to use                                           |
| `WHISPER_MODEL`         | `base`                              | Whisper model size (`tiny`/`base`/`small`/`medium`/`large`) |
| `FRONTEND_ORIGIN`       | `http://localhost:3000`             | Allowed frontend origin(s) for CORS (comma-separated)       |

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
- **Review Mode** — revisit mistakes with AI explanations + similar practice questions
- **Weakness Profile** — tracks accuracy by question type over time
- **Band score estimation** and XP rewards

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
```

---

## Testing

### Backend (RSpec)

```bash
# Run all tests
docker compose run --rm backend bundle exec rspec

# Run a specific file
docker compose run --rm backend bundle exec rspec spec/models/ielts_user_answer_spec.rb

# Run with coverage
docker compose run --rm backend bundle exec rspec --format documentation
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

## Roadmap

- [ ] IELTS Listening module
- [ ] IELTS Writing module (AI essay grading)
- [ ] IELTS Speaking module (pronunciation scoring)
- [ ] User dashboard with progress charts
- [ ] Multiplayer conversation rooms
- [ ] Mobile app (React Native)
