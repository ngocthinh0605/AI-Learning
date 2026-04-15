"""Integration tests for the FastAPI HTTP endpoints."""

import io
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app import app
from transcription import TranscriptionResult


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def mock_model(monkeypatch):
    """Replace the global Whisper model with a mock for all tests."""
    import app as app_module
    app_module._model = MagicMock()
    app_module._model.transcribe.return_value = {
        "text": " Hello from Whisper",
        "language": "en",
        "segments": [{"tokens": [1, 2], "avg_logprob": -0.2}],
    }


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_transcribe_returns_text(client):
    audio_bytes = io.BytesIO(b"fake audio content")
    response = client.post(
        "/transcribe",
        files={"audio": ("test.webm", audio_bytes, "audio/webm")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "confidence" in data
    assert "language" in data
    assert data["language"] == "en"


def test_transcribe_strips_whitespace_from_text(client):
    audio_bytes = io.BytesIO(b"fake")
    response = client.post(
        "/transcribe",
        files={"audio": ("test.webm", audio_bytes, "audio/webm")},
    )
    assert response.status_code == 200
    assert not response.json()["text"].startswith(" ")


def test_transcribe_rejects_non_audio(client):
    """Failure case: non-audio content type returns 422."""
    fake_image = io.BytesIO(b"GIF89a fake image")
    response = client.post(
        "/transcribe",
        files={"audio": ("image.gif", fake_image, "image/gif")},
    )
    assert response.status_code == 422
