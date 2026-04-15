"""Tests for the core transcription logic (no HTTP, no model required)."""

import pytest
from unittest.mock import MagicMock, patch

from transcription import transcribe_audio, _compute_confidence, TranscriptionResult


# --- _compute_confidence ---

def test_compute_confidence_with_segments():
    segments = [
        {"tokens": [1, 2, 3], "avg_logprob": -0.2},
        {"tokens": [4, 5], "avg_logprob": -0.4},
    ]
    confidence = _compute_confidence(segments)
    assert 0.0 <= confidence <= 1.0
    # -0.2 * 3 + -0.4 * 2 = -0.6 + -0.8 = -1.4 / 5 = -0.28; +1.0 = 0.72
    assert abs(confidence - 0.72) < 0.01


def test_compute_confidence_empty_segments():
    """Edge case: no segments returns default 1.0."""
    assert _compute_confidence([]) == 1.0


def test_compute_confidence_very_low_logprob():
    """Edge case: very negative logprob is clamped to 0.0."""
    segments = [{"tokens": [1], "avg_logprob": -5.0}]
    assert _compute_confidence(segments) == 0.0


# --- transcribe_audio ---

def test_transcribe_audio_returns_result():
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": " Hello world",
        "language": "en",
        "segments": [{"tokens": [1, 2], "avg_logprob": -0.1}],
    }

    result = transcribe_audio(mock_model, "/fake/path.webm")

    assert isinstance(result, TranscriptionResult)
    assert result.text == "Hello world"   # Should strip leading space
    assert result.language == "en"
    assert 0.0 <= result.confidence <= 1.0


def test_transcribe_audio_strips_whitespace():
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": "   spaces around   ",
        "language": "en",
        "segments": [],
    }
    result = transcribe_audio(mock_model, "/fake/path.webm")
    assert result.text == "spaces around"


def test_transcribe_audio_handles_missing_text():
    """Failure case: transcribe returns empty text."""
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {"language": "en", "segments": []}
    result = transcribe_audio(mock_model, "/fake/path.webm")
    assert result.text == ""
