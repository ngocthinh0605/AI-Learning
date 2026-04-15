"""
Whisper Transcription Microservice
Runs as a standalone FastAPI service on port 8001.
Accepts audio file uploads and returns transcribed text with confidence scores.
"""

import os
import tempfile
import logging
from contextlib import asynccontextmanager

import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from transcription import transcribe_audio, TranscriptionResult

logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the Whisper model once at startup to avoid per-request loading latency."""
    global _model
    logger.info(f"Loading Whisper model: {MODEL_SIZE}")
    _model = whisper.load_model(MODEL_SIZE)
    logger.info("Whisper model loaded successfully")
    yield
    _model = None


app = FastAPI(title="Whisper Transcription Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe", response_model=TranscriptionResult)
async def transcribe(audio: UploadFile = File(...)):
    """
    Accepts a WebM/WAV/MP3 audio file and returns the transcribed text,
    an overall confidence score, and the detected language.
    """
    if not audio.content_type or not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=422, detail="File must be an audio type")

    suffix = _get_suffix(audio.filename or audio.content_type)

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        result = transcribe_audio(_model, tmp_path)
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        os.unlink(tmp_path)

    return result


def _get_suffix(name_or_type: str) -> str:
    """Determines the file extension from filename or content-type."""
    if "webm" in name_or_type:
        return ".webm"
    if "mp4" in name_or_type:
        return ".mp4"
    if "wav" in name_or_type:
        return ".wav"
    return ".webm"
