# Whisper Service — Speech-to-Text Microservice

A lightweight Python FastAPI service that transcribes audio files using OpenAI's Whisper model. It runs as an isolated Docker container and is called by the Rails backend.

---

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [API Endpoints](#api-endpoints)
- [How It Works](#how-it-works)
- [Whisper Model Sizes](#whisper-model-sizes)
- [Running Locally](#running-locally)
- [Running in Docker](#running-in-docker)
- [Testing](#testing)

---

## Overview

- **Framework:** FastAPI (Python 3.11)
- **Server:** Uvicorn (ASGI)
- **Model:** OpenAI Whisper (runs 100% locally — no API key needed)
- **Port:** `8001`
- **Called by:** Rails `Ai::WhisperService` via `POST /transcribe`

The Whisper model is loaded **once at startup** and kept in memory. This avoids the multi-second model loading delay on every request.

Downloaded models are cached in a Docker volume (`whisper_models`) so they survive container restarts.

---

## Folder Structure

```
whisper-service/
│
├── Dockerfile              # Python 3.11-slim, installs Whisper from GitHub
├── requirements.txt        # Python dependencies
├── app.py                  # FastAPI app: routes, startup, CORS
├── transcription.py        # Core transcription logic + TranscriptionResult model
└── tests/
    ├── test_api.py         # FastAPI endpoint tests (httpx TestClient)
    └── test_transcription.py  # Transcription logic unit tests
```

### `app.py`
The FastAPI application. Responsibilities:
- Loads the Whisper model at startup via the `lifespan` context manager
- Exposes `GET /health` and `POST /transcribe`
- Validates that uploaded files are audio type
- Saves audio to a temp file → calls `transcribe_audio()` → deletes temp file
- Returns `TranscriptionResult` JSON

### `transcription.py`
Contains the `transcribe_audio(model, file_path)` function and the `TranscriptionResult` Pydantic model:

```python
class TranscriptionResult(BaseModel):
    transcript: str      # The transcribed text
    confidence: float    # Average segment confidence (0.0–1.0)
    language: str        # Detected language code (e.g. "en")
```

---

## API Endpoints

### `GET /health`

Returns service status and loaded model name.

**Response:**
```json
{
  "status": "ok",
  "model": "base"
}
```

### `POST /transcribe`

Accepts a multipart audio file upload and returns the transcription.

**Request:**
```
Content-Type: multipart/form-data
Body: audio=<file> (WebM, WAV, or MP4)
```

**Response:**
```json
{
  "transcript": "Hello, how are you today?",
  "confidence": 0.94,
  "language": "en"
}
```

**Error responses:**
- `422` — File is not an audio type
- `500` — Transcription failed (model error)

---

## How It Works

```
Rails Backend
    │
    │  POST /transcribe
    │  multipart: audio file
    ▼
FastAPI (app.py)
    │
    │  1. Validate content-type is audio/*
    │  2. Write audio bytes to temp file
    │  3. Call transcribe_audio(model, tmp_path)
    ▼
transcription.py
    │
    │  4. Run whisper.model.transcribe(path)
    │  5. Calculate average confidence from segments
    │  6. Return TranscriptionResult
    ▼
FastAPI
    │
    │  7. Delete temp file
    │  8. Return JSON response
    ▼
Rails Backend
    │
    │  9. Extract transcript
    │  10. Pass to Gemma for AI response
```

---

## Whisper Model Sizes

Set via the `WHISPER_MODEL` environment variable:

| Model | Size | Speed | Accuracy | RAM Required |
|-------|------|-------|----------|-------------|
| `tiny` | 39 MB | Fastest | Lowest | ~1 GB |
| `base` | 74 MB | Fast | Good | ~1 GB |
| `small` | 244 MB | Medium | Better | ~2 GB |
| `medium` | 769 MB | Slow | High | ~5 GB |
| `large` | 1.5 GB | Slowest | Highest | ~10 GB |

**Recommended:** `base` for development (fast, accurate enough for clear speech).

---

## Running Locally

```bash
cd whisper-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Whisper (from GitHub to avoid PyPI build errors)
pip install git+https://github.com/openai/whisper.git

# Start the service
WHISPER_MODEL=base uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

The service will be available at `http://localhost:8001`.

> On first run, Whisper downloads the model (~74 MB for `base`) to `~/.cache/whisper/`.

---

## Running in Docker

The service starts automatically with `docker compose up`. To rebuild after code changes:

```bash
docker compose up -d --build whisper
```

**Note:** The `Dockerfile` installs Whisper directly from the GitHub repository (not PyPI) to avoid a known `pkg_resources` build error in the PyPI release tarballs.

Model files are cached in the `whisper_models` Docker volume:
```yaml
volumes:
  - whisper_models:/root/.cache/whisper
```

This means the model is only downloaded once, even across `docker compose down` / `up` cycles. Use `docker compose down -v` to clear the cache.

---

## Testing

```bash
cd whisper-service

# Activate virtual environment first
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run a specific test file
pytest tests/test_api.py -v
```

### Test files

**`tests/test_api.py`**
Tests the FastAPI endpoints using `httpx.AsyncClient` (TestClient):
- `GET /health` returns 200 with model name
- `POST /transcribe` with valid audio returns transcript
- `POST /transcribe` with non-audio file returns 422

**`tests/test_transcription.py`**
Tests the `transcribe_audio` function directly:
- Returns `TranscriptionResult` with correct fields
- Handles short/empty audio
- Confidence score is between 0.0 and 1.0
