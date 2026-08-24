import base64
import io
import time
import threading
import urllib.request
import urllib.parse
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DEFAULT_MODEL_PATH = (
    PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-final" / "weights" / "best.pt"
)
if not DEFAULT_MODEL_PATH.exists():
    # Fallback to gpu weights if final weights not found
    DEFAULT_MODEL_PATH = (
        PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-gpu" / "weights" / "best.pt"
    )

app = FastAPI(
    title="Kitchen Hygiene AI - Inference Server",
    description="REST API for YOLOv11 Kitchen Hygiene Safety & Apparel Compliance Detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model globally
model = None

import os
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

# --- Telegram Config (Read from environment variables) ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()


def send_telegram_alert(detections, inference_time_ms, is_video=False):
    """Send a smart human-readable Telegram alert after each inference if credentials are provided."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return

    def _send():
        try:
            import json as _json
            from datetime import datetime

            # Map detected class names
            detected_names = {d.class_name for d in detections}

            # What's MISSING (these classes = violation = not wearing)
            missing = []
            if "apron" in detected_names:    missing.append("apron")
            if "gloves" in detected_names:   missing.append("gloves")
            if "hairnet" in detected_names:  missing.append("hairnet")
            if "mask" in detected_names:     missing.append("mask")

            # What's WEARING (these classes = compliant = wearing)
            wearing = []
            if "no_apron" in detected_names:   wearing.append("apron")
            if "no_gloves" in detected_names:  wearing.append("gloves")
            if "no_hairnet" in detected_names: wearing.append("hairnet")

            now = datetime.now().strftime("%I:%M %p")
            media = "Video" if is_video else "Image"
            lines = [f"Kitchen Hygiene AI Alert ({media}) - {now}"]
            lines.append("-" * 32)

            if wearing:
                lines.append(f"Wearing: {', '.join(wearing)}")
            if missing:
                lines.append(f"Missing: {', '.join(missing)}")
            if not wearing and not missing:
                lines.append("No PPE items detected in frame.")

            lines.append("")
            if missing:
                lines.append(f"ACTION REQUIRED: {', '.join(missing).upper()} not worn!")
            else:
                lines.append("Kitchen is COMPLIANT - All good!")

            lines.append(f"Scanned in {inference_time_ms} ms")

            payload = _json.dumps({
                "chat_id": TELEGRAM_CHAT_ID,
                "text": "\n".join(lines)
            }).encode("utf-8")
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            print(f"[Telegram] Notification failed: {e}")
    threading.Thread(target=_send, daemon=True).start()


@app.on_event("startup")
def load_yolo_model():
    global model
    torch.set_num_threads(2)
    print(f"Loading YOLO model from: {DEFAULT_MODEL_PATH}")
    model = YOLO(str(DEFAULT_MODEL_PATH))
    # Warm up model with a dummy frame so subsequent user requests are instant
    try:
        dummy = np.zeros((320, 320, 3), dtype=np.uint8)
        model.predict(source=dummy, imgsz=320, device="cpu", verbose=False)
        print("YOLO model warmed up and ready for instant inference!")
    except Exception as e:
        print(f"Warmup notice: {e}")


class DetectionBox(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [xmin, ymin, xmax, ymax]


class InferenceResponse(BaseModel):
    success: bool
    inference_time_ms: float
    detections_count: int
    detections: List[DetectionBox]
    annotated_image_base64: Optional[str] = None


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_path": str(DEFAULT_MODEL_PATH),
        "model_loaded": model is not None,
    }


import tempfile

@app.post("/predict", response_model=InferenceResponse)
async def predict(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.45),
    return_image: bool = Form(True),
):
    content_type = file.content_type or ""
    filename = file.filename or ""
    is_video = content_type.startswith("video/") or filename.lower().endswith((".mp4", ".mov", ".avi", ".webm", ".mkv"))

    try:
        contents = await file.read()
        
        if is_video:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            
            cap = cv2.VideoCapture(tmp_path)
            ret, frame_bgr = cap.read()
            cap.release()
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
            
            if not ret or frame_bgr is None:
                raise HTTPException(status_code=400, detail="Could not extract video frames from file.")
            
            img_np = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        else:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            # Downscale large mobile uploads if >1280 to ensure lightning fast CPU inference (<150ms)
            if max(image.size) > 1280:
                image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
            img_np = np.array(image)

        start_time = time.time()
        device = "0" if torch.cuda.is_available() else "cpu"
        results = model.predict(source=img_np, conf=conf, iou=iou, imgsz=640, device=device, verbose=False)
        end_time = time.time()
        inference_time_ms = round((end_time - start_time) * 1000, 2)

        result = results[0]
        detections = []

        names = result.names
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = names.get(cls_id, str(cls_id))
            confidence = round(float(box.conf[0].item()), 4)
            xyxy = [round(float(x), 2) for x in box.xyxy[0].tolist()]

            detections.append(
                DetectionBox(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=confidence,
                    bbox=xyxy,
                )
            )

        annotated_b64 = None
        if return_image:
            res_bgr = result.plot()
            res_rgb = cv2.cvtColor(res_bgr, cv2.COLOR_BGR2RGB)
            pil_res = Image.fromarray(res_rgb)
            buff = io.BytesIO()
            pil_res.save(buff, format="JPEG")
            annotated_b64 = base64.b64encode(buff.getvalue()).decode("utf-8")

        # Fire Telegram notification (non-blocking)
        send_telegram_alert(detections, inference_time_ms, is_video=is_video)

        return InferenceResponse(
            success=True,
            inference_time_ms=inference_time_ms,
            detections_count=len(detections),
            detections=detections,
            annotated_image_base64=annotated_b64,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", response_class=HTMLResponse)
def index_ui():
    root_index = PROJECT_ROOT / "index.html"
    frontend_index = FRONTEND_DIR / "index.html"
    if root_index.exists():
        return FileResponse(str(root_index))
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    return HTMLResponse("<h1>Kitchen Hygiene AI Frontend Not Found</h1>")


if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_assets")
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
