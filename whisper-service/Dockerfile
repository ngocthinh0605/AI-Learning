FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install setuptools first, then install openai-whisper directly from GitHub
# Reason: all PyPI releases of openai-whisper (including 20240930) use a legacy
# setup.py that calls pkg_resources at build time, which is absent in Python 3.11
# slim images. The GitHub HEAD has a fixed pyproject.toml that avoids this entirely.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir "openai-whisper @ git+https://github.com/openai/whisper.git"

COPY requirements.txt .
# Install remaining deps (excluding openai-whisper which is already installed above)
RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    "uvicorn[standard]==0.29.0" \
    python-multipart==0.0.9 \
    "pydantic==2.6.0" \
    numpy \
    pytest==8.1.0 \
    httpx==0.27.0 \
    pytest-asyncio==0.23.0

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
