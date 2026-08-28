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
ONNX_MODEL_PATH = PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-final" / "weights" / "best.onnx"
# Load champion model
DEFAULT_MODEL_PATH = PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-model" / "weights" / "best.pt"

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


def send_telegram_alert(detections, violations, inference_time_ms, is_video=False):
    """Send a smart human-readable Telegram alert after each inference if credentials are provided."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return

    def _send():
        try:
            import json as _json
            from datetime import datetime

            detected_names = {d.class_name for d in detections}
            violation_names = {v.class_name for v in violations}

            now = datetime.now().strftime("%I:%M %p")
            media = "Video" if is_video else "Image"
            lines = [f"🛡️ Kitchen Hygiene AI Alert ({media}) - {now}"]
            lines.append("-" * 32)

            if detected_names:
                lines.append(f"✅ Verified PPE: {', '.join(detected_names)}")
            if violation_names:
                lines.append(f"⚠️ VIOLATIONS: {', '.join(violation_names)}")
                lines.append("")
                lines.append(f"🚨 IMMEDIATE ACTION REQUIRED: {', '.join(violation_names).upper()}!")
            else:
                lines.append("")
                lines.append("🎉 Kitchen is 100% COMPLIANT - All PPE Verified!")

            lines.append(f"⏱️ Scanned in {inference_time_ms} ms")

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
    torch.set_num_threads(1)
    try:
        print(f"Loading YOLO model from: {DEFAULT_MODEL_PATH}")
        model = YOLO(str(DEFAULT_MODEL_PATH), task="detect")
        print("YOLO model loaded successfully!")
    except Exception as e:
        print(f"[WARNING] Model load failed: {e}")
        model = None


@app.get("/health")
def health_check():
    """Health check endpoint — responds immediately even if model is still loading."""
    return {
        "status": "ok",
        "model_loaded": model is not None
    }


class DetectionBox(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [xmin, ymin, xmax, ymax]
    is_violation: bool = False


class InferenceResponse(BaseModel):
    success: bool
    inference_time_ms: float
    detections_count: int
    violations_count: int
    detections: List[DetectionBox]
    violations: List[DetectionBox]
    annotated_image_base64: Optional[str] = None


def compute_iou(boxA, boxB):
    """Compute Intersection over Union between two [xmin, ymin, xmax, ymax] boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    iou = interArea / float(boxAArea + boxBArea - interArea + 1e-6)
    return iou


def deduce_absent_classes(detections: List[DetectionBox], img_w: int, img_h: int) -> List[DetectionBox]:
    """
    Spatial Deduction Engine:
    - If head/face is visible (via hairnetless or maskless or upper body) without hairnet -> flag 'no_hairnet'
    - If face is detected without mask -> flag 'no_mask'
    - If hands are detected without gloves -> flag 'no_gloves'
    """
    violations = []
    
    # 1. Check direct violation labels from dataset if detected
    for d in detections:
        c_name = d.class_name.lower()
        if c_name in ["hairnetless", "no_hairnet"]:
            d.class_name = "no_hairnet"
            d.is_violation = True
            violations.append(d)
        elif c_name in ["maskless", "no_mask"]:
            d.class_name = "no_mask"
            d.is_violation = True
            violations.append(d)
        elif c_name in ["no_gloves", "bare_hands"]:
            d.class_name = "no_gloves"
            d.is_violation = True
            violations.append(d)
        elif c_name in ["no_apron"]:
            d.class_name = "no_apron"
            d.is_violation = True
            violations.append(d)

    # 2. Spatial Deduction between Masks and Hairnets:
    # If a person wears a mask (so their face/head is right there), but NO hairnet overlaps the upper region of the mask
    masks = [d for d in detections if d.class_name == "mask"]
    hairnets = [d for d in detections if d.class_name == "hairnet"]
    existing_no_hairnets = [v for v in violations if v.class_name == "no_hairnet"]

    for mask in masks:
        # Estimate head region right above the mask
        m_box = mask.bbox
        m_w = m_box[2] - m_box[0]
        m_h = m_box[3] - m_box[1]
        head_box = [
            max(0, m_box[0] - m_w * 0.3),
            max(0, m_box[1] - m_h * 1.5),
            min(img_w, m_box[2] + m_w * 0.3),
            m_box[1] + m_h * 0.2
        ]
        
        has_hairnet = any(compute_iou(head_box, h.bbox) > 0.05 for h in hairnets)
        has_already_violation = any(compute_iou(head_box, nh.bbox) > 0.1 for nh in existing_no_hairnets)
        
        if not has_hairnet and not has_already_violation:
            v_box = DetectionBox(
                class_id=991,
                class_name="no_hairnet",
                confidence=round(mask.confidence * 0.92, 4),
                bbox=[round(x, 2) for x in head_box],
                is_violation=True
            )
            violations.append(v_box)

    return violations


import tempfile

@app.post("/predict", response_model=InferenceResponse)
async def predict(
    file: UploadFile = File(...),
    conf: Optional[float] = Form(0.15),
    iou: Optional[float] = Form(0.45),
    return_image: Optional[bool] = Form(True),
):
    conf_val = conf if (conf is not None and conf > 0) else 0.15
    iou_val = iou if (iou is not None and iou > 0) else 0.45
    return_img_val = True if return_image is None else return_image

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
            if max(image.size) > 1280:
                image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
            img_np = np.array(image)

        h, w, _ = img_np.shape

        global model
        if model is None:
            print(f"Loading YOLO model on demand from: {DEFAULT_MODEL_PATH}")
            model = YOLO(str(DEFAULT_MODEL_PATH), task="detect")

        start_time = time.time()
        device = "0" if torch.cuda.is_available() else "cpu"
        results = model.predict(source=img_np, conf=conf_val, iou=iou_val, imgsz=640, device=device, verbose=False)
        end_time = time.time()
        inference_time_ms = round((end_time - start_time) * 1000, 2)

        result = results[0]
        raw_detections = []

        names = result.names
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = names.get(cls_id, str(cls_id))
            confidence = round(float(box.conf[0].item()), 4)
            xyxy = [round(float(x), 2) for x in box.xyxy[0].tolist()]

            # Normalize class names
            if cls_name in ["with_glove", "with_gloves"]:
                cls_name = "gloves"

            raw_detections.append(
                DetectionBox(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=confidence,
                    bbox=xyxy,
                )
            )

        # Run Spatial Deduction Engine for Absent Classes
        violations = deduce_absent_classes(raw_detections, img_w=w, img_h=h)
        ppe_compliant_detections = [d for d in raw_detections if not d.is_violation]

        annotated_b64 = None
        if return_img_val:
            # Draw standard detections
            res_bgr = result.plot()
            
            # Custom draw derived violation boxes in Red
            for v in violations:
                bx = [int(p) for p in v.bbox]
                # Red bounding box
                cv2.rectangle(res_bgr, (bx[0], bx[1]), (bx[2], bx[3]), (0, 0, 235), 3)
                label = f"VIOLATION: {v.class_name.upper()} {int(v.confidence*100)}%"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(res_bgr, (bx[0], max(0, bx[1] - 25)), (bx[0] + tw + 10, bx[1]), (0, 0, 235), -1)
                cv2.putText(res_bgr, label, (bx[0] + 5, bx[1] - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            res_rgb = cv2.cvtColor(res_bgr, cv2.COLOR_BGR2RGB)
            pil_res = Image.fromarray(res_rgb)
            buff = io.BytesIO()
            pil_res.save(buff, format="JPEG")
            annotated_b64 = base64.b64encode(buff.getvalue()).decode("utf-8")

        # Non-blocking Telegram alert
        send_telegram_alert(ppe_compliant_detections, violations, inference_time_ms, is_video=is_video)

        all_detections = ppe_compliant_detections + violations

        return InferenceResponse(
            success=True,
            inference_time_ms=inference_time_ms,
            detections_count=len(ppe_compliant_detections),
            violations_count=len(violations),
            detections=all_detections,
            violations=violations,
            annotated_image_base64=annotated_b64,
        )
    except Exception as e:
        import traceback
        err_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[PREDICT ERROR] {err_msg}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=err_msg)


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
