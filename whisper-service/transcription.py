"""
Core transcription logic — separated from HTTP layer for testability.
"""

from typing import Optional
from pydantic import BaseModel
import whisper
import numpy as np


class TranscriptionResult(BaseModel):
    text: str
    confidence: float   # 0.0 - 1.0 derived from Whisper's segment-level log probabilities
    language: str


def transcribe_audio(model: whisper.Whisper, audio_path: str) -> TranscriptionResult:
    """
    Runs Whisper transcription on the given file path.
    Computes an aggregate confidence score from segment-level log probabilities.

    Args:
        model: A loaded Whisper model instance.
        audio_path: Absolute path to the audio file.

    Returns:
        TranscriptionResult with text, confidence, and detected language.
    """
    result = model.transcribe(audio_path, verbose=False)

    text = result.get("text", "").strip()
    language = result.get("language", "en")
    segments = result.get("segments", [])

    confidence = _compute_confidence(segments)

    return TranscriptionResult(text=text, confidence=confidence, language=language)


def _compute_confidence(segments: list) -> float:
    """
    Derives an overall confidence score (0.0 - 1.0) from Whisper segment log probabilities.
    Reason: Whisper doesn't expose a single confidence value; we aggregate per-token
    avg_logprob across segments (weighted by token count) then convert to 0-1 scale.
    """
    if not segments:
        return 1.0

    total_tokens = 0
    weighted_logprob = 0.0

    for seg in segments:
        n_tokens = len(seg.get("tokens", [])) or 1
        avg_lp = seg.get("avg_logprob", -0.5)
        weighted_logprob += avg_lp * n_tokens
        total_tokens += n_tokens

    mean_logprob = weighted_logprob / total_tokens if total_tokens > 0 else -0.5

    # Map from typical range [-1.0, 0.0] to [0.0, 1.0] and clamp
    confidence = float(np.clip(mean_logprob + 1.0, 0.0, 1.0))
    return round(confidence, 3)
