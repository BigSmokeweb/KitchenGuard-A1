<div align="center">

# 🛡️ KitchenGuard AI
### Intelligent Computer Vision & Hygiene Compliance Monitoring for Commercial Kitchens

[![YOLOv11](https://img.shields.io/badge/Model-YOLOv11-10B981?style=for-the-badge&logo=yolo)](https://github.com/ultralytics/ultralytics)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![ONNX](https://img.shields.io/badge/Inference-ONNX_Runtime-005CED?style=for-the-badge&logo=onnx)](https://onnxruntime.ai/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel)](https://kitchen-guard-a1.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**KitchenGuard AI** is a computer-vision powered safety and hygiene inspection platform designed to keep commercial kitchens audit-ready 24/7. It automatically detects Personal Protective Equipment (PPE) compliance, hygiene protocol breaches, and safety violations in real time from CCTV video feeds and image snapshots.

---

</div>

## 📌 Key Capabilities

- **Real-Time PPE Detection**: Instant multi-class object detection verifying `hairnet`, `apron`, `gloves`, `mask`, and flagging violations (`no_apron`, `no_gloves`, `no_hairnet`).
- **Sub-Second Inference**: Optimized ONNX Runtime engine achieving **<150ms** CPU latency and **<30ms** GPU latency.
- **Automated Telegram Alerts**: Instant notifications dispatched to floor managers with timestamped incident logs and violation summaries.
- **Regulatory Alignment**: Designed to assist compliance benchmarking against **HACCP**, **FDA 21 CFR Part 11**, and **ISO 22000**.
- **Interactive Web Sandbox**: Drag-and-drop live testing suite with visual bounding boxes, confidence tags, and hygiene telemetry.

---

## 🏷️ Detected Classes

The model is trained on custom commercial kitchen datasets with **7 detection classes**:

| Class ID | Label | Category | Compliance Status |
| :---: | :--- | :---: | :---: |
| `0` | **`apron`** | PPE | ✅ Compliant |
| `1` | **`gloves`** | PPE / Hygiene | ✅ Compliant |
| `2` | **`hairnet`** | Headwear | ✅ Compliant |
| `3` | **`mask`** | Hygiene | ✅ Compliant |
| `4` | **`no_apron`** | Violation | ⚠️ Action Required |
| `5` | **`no_gloves`** | Violation | ⚠️ Action Required |
| `6` | **`no_hairnet`** | Violation | ⚠️ Action Required |

---

## Quick Start

### 1. Setup Environment
```bash
git clone https://github.com/BigSmokeweb/KitchenGuard-A1.git
cd KitchenGuard-A1

# Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

---

## Usage

### Run CLI Inference
Run detection on images and export annotated outputs to `inference_outputs/test_images/`:
```bash
python scripts/predict_image.py dataset/valid/images/sample.jpg
```

### Start the API Server
```bash
python scripts/server.py
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- Predict endpoint: `POST http://localhost:8000/predict` (accepts image/video uploads)

### Train the Model
```bash
python scripts/train.py --model yolo11n.pt --epochs 100 --imgsz 640 --batch 16
```

### Check Dataset Structure
```bash
python scripts/check_dataset.py
```

---

## 🤖 Telegram Bot Notifications *(Optional)*

To receive automated alerts on your phone whenever a kitchen safety infraction is detected:

1. Its an alternative to alert manager to inform the staff in kitchen to follow the rules.
2. This is free verion for realtime notifiction.
3. For heavy traffic you can use other methods like Twillio and whatsapp.
4. Create a bot using [@BotFather](https://t.me/BotFather) and obtain your `TELEGRAM_BOT_TOKEN`.
5. Get your `TELEGRAM_CHAT_ID` using [@userinfobot](https://t.me/userinfobot).
6. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details. Built by [Milind](https://github.com/BigSmokeweb).