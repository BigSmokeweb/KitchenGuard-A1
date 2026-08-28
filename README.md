<div align="center">

# 🛡️ KitchenGuard AI
### Real-Time Computer Vision & Automated Hygiene Compliance for Commercial Kitchens

[![YOLOv11](https://img.shields.io/badge/Model-YOLOv11s_90%25_Precision-10B981?style=for-the-badge&logo=yolo)](https://github.com/ultralytics/ultralytics)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deploy-Docker_&_Railway-005CED?style=for-the-badge&logo=docker)](https://railway.app)
[![Telegram](https://img.shields.io/badge/Alerts-Telegram_Bot-229ED9?style=for-the-badge&logo=telegram)](https://telegram.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**[Live Web App & AI Sandbox](https://kitchenguard-a1-production.up.railway.app)** • **[API Swagger Docs](https://kitchenguard-a1-production.up.railway.app/docs)**

---

**KitchenGuard AI** is an intelligent, high-accuracy computer vision platform engineered for commercial kitchens, food processing plants, and culinary workstations. Powered by fine-tuned **YOLOv11** and an automated **Spatial Deduction Engine**, it verifies Personal Protective Equipment (PPE) adherence and flags hygiene infractions in real-time.

</div>

---

## ✨ Key Features & Capabilities

- 🎯 **High-Precision Detection (~90% Precision / 89.2% mAP Gloves)**: Fine-tuned on specialized food prep datasets for robust, real-world generalization across varying lighting, angles, and skin tones.
- 🧠 **Spatial Deduction & Absence Reasoning**: Automatically localizes worker facial/head geometry to flag missing PPE (`no_hairnet`, `no_mask`) in bold **Red**, even when zero PPE is worn.
- ⚡ **Sub-250ms Low-Latency Inference**: Fully containerized and optimized with CPU-tailored PyTorch & OpenCV headless pipelines.
- 📱 **Real-Time Telegram Incident Dispatch**: Automatic alert broadcast to kitchen managers with timestamped logs, PPE telemetry, and severity status.
- 🎨 **Interactive AI Sandbox**: Drag-and-drop web dropzone supporting both single-frame photo analysis and full MP4 video clip scanning.
- 📜 **Regulatory Alignment**: Designed to assist compliance benchmarking against **HACCP**, **FDA 21 CFR**, and **ISO 22000**.

---

## 🏷️ Detection Taxonomy

| Category | Class / Flag | Color Tag | Behavior & Meaning |
| :--- | :--- | :---: | :--- |
| **PPE Compliance** | **`hairnet`** | 🟢 Green | Verified clean hairnet / chef hat covering hair |
| **PPE Compliance** | **`mask`** | 🟢 Green | Verified protective face / beard mask covering mouth & nose |
| **PPE Compliance** | **`gloves`** | 🟢 Green | Verified sanitary food-handling gloves (latex / nitrile) |
| **Hygiene Infraction** | **`no_hairnet`** | 🔴 Red | Worker head detected without required hair covering |
| **Hygiene Infraction** | **`no_mask`** | 🔴 Red | Worker face detected without protective face mask |

---

## 📊 Model Architecture & Benchmarks

The production system runs the **`kitchen-hygiene-model`** checkpoint (`YOLOv11s`):

```
Model Summary: 126 layers, 9.4M parameters, 640px resolution
Latency: ~2.4 ms GPU (RTX 4060) / ~180 ms CPU (Cloud Container)
```

| Class | Precision (P) | Recall (R) | **mAP@0.50** | **mAP@0.50:0.95** |
| :--- | :---: | :---: | :---: | :---: |
| **`gloves`** | **`87.3%`** | **`83.8%`** | **`89.2%`** ⭐ | **`58.1%`** |
| **`mask`** | **`85.3%`** | **`68.4%`** | **`74.5%`** | **`35.6%`** |
| **`hairnet`** | **`77.4%`** | **`57.1%`** | **`63.6%`** | **`25.6%`** |
| **Overall Peak** | **`90.08%`** | **`79.48%`** | **`77.53%`** | **`39.30%`** |

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/BigSmokeweb/KitchenGuard-A1.git
cd KitchenGuard-A1

# Create virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Inference Server
```bash
python -m uvicorn scripts.server:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🐳 Docker & Cloud Deployment

Build and run anywhere with the optimized production container:

```bash
# Build the Docker image
docker build -t kitchenguard-ai .

# Run locally
docker run -p 8000:8000 --env-file .env kitchenguard-ai
```

### One-Click Railway Deployment
1. Connect your repository to **[Railway](https://railway.app)**.
2. Railway auto-detects [`Dockerfile`](Dockerfile) and [`railway.json`](railway.json).
3. Set your optional environment variables (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) in the **Variables** tab.

---

## 📱 Telegram Alert Integration

To receive instant push notifications whenever a kitchen safety violation is detected:

1. Create a bot using [@BotFather](https://t.me/BotFather) and copy your `TELEGRAM_BOT_TOKEN`.
2. Get your Chat ID by messaging [@userinfobot](https://t.me/userinfobot).
3. Add to your local `.env` file (or Railway Dashboard):
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```
4. Test delivery instantly at: `http://localhost:8000/test-telegram`

---

## 📁 Repository Structure

```
kitchen-hygiene-ai/
├── dataset/                  # Cleaned 3-class dataset (train/valid/test)
├── frontend/                 # UI assets, CSS design system & client logic
├── inference_outputs/
│   └── kitchen-hygiene-model/# Champion YOLOv11s weights (best.pt) & curves
├── scripts/
│   ├── server.py             # FastAPI backend + Spatial Deduction Engine
│   ├── train.py              # Hyperparameter-tuned training pipeline
│   ├── predict_image.py      # CLI inference tool
│   ├── check_dataset.py      # Dataset validation utility
│   └── check_gpu.py          # CUDA hardware checker
├── index.html                # Responsive landing page & AI DropZone
├── Dockerfile                # Production multi-stage container
├── railway.json              # Cloud deployment orchestration config
├── requirements.txt          # Production dependencies
└── README.md                 # Project documentation
```

---

## 📄 License & Attribution

Distributed under the **MIT License**. Created & maintained by [Milind Sahu](https://github.com/BigSmokeweb).