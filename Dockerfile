FROM python:3.11-slim-bookworm

WORKDIR /app

# System deps (minimal — headless opencv doesn't need libgl1)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps — PyTorch CPU first, then rest
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 300 \
    torch==2.2.2 torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --timeout 300 -r requirements.txt
# ultralytics pulls opencv-python (non-headless) which needs libxcb — force headless version
RUN pip install --no-cache-dir opencv-python-headless --force-reinstall

# App files
COPY index.html .
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
COPY inference_outputs/ ./inference_outputs/

EXPOSE 8000

# Shell form: allows $PORT env var expansion (Railway injects PORT at runtime)
CMD sh -c "uvicorn scripts.server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"
