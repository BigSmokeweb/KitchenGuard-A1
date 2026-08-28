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

# App files
COPY index.html .
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
COPY inference_outputs/ ./inference_outputs/

EXPOSE 8000

# Railway healthcheck is configured in railway.json
# Model takes ~15s to load — Railway's healthcheckTimeout handles this
CMD ["uvicorn", "scripts.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
