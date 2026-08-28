# ── Stage 1: Base image ────────────────────────────────────────────────────────
# Using slim Python image for smallest possible final size
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required by OpenCV and torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# ── Install Python dependencies first (cached layer) ─────────────────────────
COPY requirements.txt .

# Install CPU-only PyTorch (much smaller image ~800MB vs ~3GB for CUDA)
# Switch to the CUDA line below if deploying on a GPU host
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

# ── Copy application code ─────────────────────────────────────────────────────
COPY index.html .
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
COPY inference_outputs/ ./inference_outputs/

# Copy optional env example (actual .env should be passed at runtime)
COPY .env.example .

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Health check ──────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# ── Run server ────────────────────────────────────────────────────────────────
# Railway injects $PORT at runtime — shell form allows env var expansion
CMD uvicorn scripts.server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
