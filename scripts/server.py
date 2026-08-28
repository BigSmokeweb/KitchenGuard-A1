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

# --- Telegram Config (Read strictly from environment variables) ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()


def send_telegram_alert(detections, violations, inference_time_ms, is_video=False, annotated_img_bytes: Optional[bytes] = None):
    """Send an instant human-readable Telegram alert with formatted message after each scan."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip() or TELEGRAM_BOT_TOKEN
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip() or TELEGRAM_CHAT_ID

    if not token or not chat_id:
        return

    def _send():
        try:
            import json as _json
            from datetime import datetime

            detected_names = sorted(list({d.class_name for d in detections if not d.is_violation}))
            violation_names = sorted(list({v.class_name for v in violations}))

            now = datetime.now().strftime("%I:%M:%S %p")
            media = "Video Stream" if is_video else "Image Scan"

            if violation_names:
                header = f"🚨 *KITCHEN HYGIENE VIOLATION ALERT* 🚨"
                status_line = f"⚠️ *Status:* NON-COMPLIANT ({len(violation_names)} violations)"
            else:
                header = f"🛡️ *KITCHEN COMPLIANCE REPORT* ✅"
                status_line = f"✅ *Status:* 100% COMPLIANT"

            lines = [
                header,
                f"🕒 *Time:* `{now}` | *Type:* `{media}`",
                status_line,
                "────────────────────────"
            ]

            if detected_names:
                lines.append(f"🟢 *Verified PPE:* {', '.join([f'`{name}`' for name in detected_names])}")
            if violation_names:
                lines.append(f"🔴 *Violations:* {', '.join([f'`{name}`' for name in violation_names])}")
                lines.append(f"⚡ *Action Required:* Please notify station supervisor!")
            else:
                lines.append("🎉 All required kitchen safety apparel verified.")

            lines.append(f"⏱️ *Latency:* `{inference_time_ms} ms` (YOLOv11s)")

            msg_text = "\n".join(lines)

            # Send Telegram Markdown message
            payload = _json.dumps({
                "chat_id": chat_id,
                "text": msg_text,
                "parse_mode": "Markdown"
            }).encode("utf-8")

            req = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/sendMessage",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"[Telegram] Alert sent successfully (status {resp.status})")
        except Exception as e:
            print(f"[Telegram Alert Error] {e}")

    threading.Thread(target=_send, daemon=True).start()


@app.get("/test-telegram")
def test_telegram(token: Optional[str] = None, chat_id: Optional[str] = None):
    """Instant test endpoint to verify Telegram credentials and message delivery."""
    t = token or os.getenv("TELEGRAM_BOT_TOKEN", "").strip() or TELEGRAM_BOT_TOKEN
    c = chat_id or os.getenv("TELEGRAM_CHAT_ID", "").strip() or TELEGRAM_CHAT_ID

    if not t or not c:
        return {
            "success": False,
            "error": "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.",
            "instructions": "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Railway Variables tab."
        }

    try:
        import json as _json
        test_msg = (
            "🛡️ *KitchenGuard AI - Telegram Integration Verified!*\n"
            "────────────────────────\n"
            "✅ Your Telegram alert bot is connected and ready to broadcast live hygiene compliance and violation notices.\n"
            "🚀 *Status:* Online & Monitoring"
        )
        payload = _json.dumps({
            "chat_id": c,
            "text": test_msg,
            "parse_mode": "Markdown"
        }).encode("utf-8")

        req = urllib.request.Request(
            f"https://api.telegram.org/bot{t}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {
                "success": True,
                "message": "Test notification sent! Check your Telegram chat."
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
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


# Load standard OpenCV Haar cascade for face detection
_face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_face_cascade_path) if cv2.data else None


def deduce_absent_classes(detections: List[DetectionBox], img_w: int, img_h: int, img_rgb: Optional[np.ndarray] = None) -> List[DetectionBox]:
    """
    Spatial Deduction Engine:
    1. Direct violation labels
    2. Mask-to-Hairnet deduction
    3. Direct Face/Head Anchor: detect human faces and flag missing hairnets / masks
    """
    violations = []
    
    # 1. Check direct violation labels
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

    # 2. Face Detection: If a person is present in the frame
    detected_faces = []
    if img_rgb is not None and _face_cascade is not None and not _face_cascade.empty():
        try:
            gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
            faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
            for (fx, fy, fw, fh) in faces:
                detected_faces.append([float(fx), float(fy), float(fx + fw), float(fy + fh)])
        except Exception as e:
            print(f"[Face Cascade Notice] {e}")

    masks = [d for d in detections if d.class_name == "mask"]
    hairnets = [d for d in detections if d.class_name == "hairnet"]

    # 3. Check each detected face for missing hairnet & missing mask
    for f_box in detected_faces:
        f_w = f_box[2] - f_box[0]
        f_h = f_box[3] - f_box[1]

        # Head region above the face
        head_box = [
            max(0, f_box[0] - f_w * 0.2),
            max(0, f_box[1] - f_h * 0.9),
            min(img_w, f_box[2] + f_w * 0.2),
            min(img_h, f_box[1] + f_h * 0.4)
        ]

        # Lower face region where mask should be
        mask_area = [
            max(0, f_box[0] - f_w * 0.1),
            max(0, f_box[1] + f_h * 0.35),
            min(img_w, f_box[2] + f_w * 0.1),
            min(img_h, f_box[3] + f_h * 0.2)
        ]

        # A) Check missing hairnet
        has_hairnet = any(compute_iou(head_box, h.bbox) > 0.05 for h in hairnets)
        if not has_hairnet and not any(compute_iou(head_box, v.bbox) > 0.15 for v in violations if v.class_name == "no_hairnet"):
            violations.append(
                DetectionBox(
                    class_id=991,
                    class_name="no_hairnet",
                    confidence=0.88,
                    bbox=[round(x, 2) for x in head_box],
                    is_violation=True
                )
            )

        # B) Check missing mask
        has_mask = any(compute_iou(mask_area, m.bbox) > 0.08 for m in masks)
        if not has_mask and not any(compute_iou(mask_area, v.bbox) > 0.15 for v in violations if v.class_name == "no_mask"):
            violations.append(
                DetectionBox(
                    class_id=992,
                    class_name="no_mask",
                    confidence=0.90,
                    bbox=[round(x, 2) for x in mask_area],
                    is_violation=True
                )
            )

    # 4. Fallback Mask-to-Hairnet deduction (if face cascade didn't catch face but YOLO found mask)
    for mask in masks:
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
        if not has_hairnet and not any(compute_iou(head_box, v.bbox) > 0.15 for v in violations if v.class_name == "no_hairnet"):
            violations.append(
                DetectionBox(
                    class_id=991,
                    class_name="no_hairnet",
                    confidence=round(mask.confidence * 0.92, 4),
                    bbox=[round(x, 2) for x in head_box],
                    is_violation=True
                )
            )

    return violations


import tempfile

@app.post("/predict", response_model=InferenceResponse)
async def predict(
    file: UploadFile = File(...),
    conf: Optional[float] = Form(0.35),
    iou: Optional[float] = Form(0.45),
    return_image: Optional[bool] = Form(True),
):
    conf_val = conf if (conf is not None and conf > 0) else 0.35
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

        # Run Spatial Deduction Engine for Absent Classes (with face/head detection)
        violations = deduce_absent_classes(raw_detections, img_w=w, img_h=h, img_rgb=img_np)
        ppe_compliant_detections = [d for d in raw_detections if not d.is_violation]

        annotated_b64 = None
        if return_img_val:
            # result.plot() returns RGB when input is RGB
            res_rgb = result.plot()
            
            # Custom draw derived violation boxes in Red (RGB: [235, 0, 0])
            for v in violations:
                bx = [int(p) for p in v.bbox]
                # Red bounding box (RGB)
                cv2.rectangle(res_rgb, (bx[0], bx[1]), (bx[2], bx[3]), (235, 0, 0), 3)
                label = f"VIOLATION: {v.class_name.upper()} {int(v.confidence*100)}%"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(res_rgb, (bx[0], max(0, bx[1] - 25)), (bx[0] + tw + 10, bx[1]), (235, 0, 0), -1)
                cv2.putText(res_rgb, label, (bx[0] + 5, bx[1] - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            pil_res = Image.fromarray(res_rgb)
            buff = io.BytesIO()
            pil_res.save(buff, format="JPEG", quality=90)
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


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
