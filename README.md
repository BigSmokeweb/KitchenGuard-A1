# Kitchen Hygiene AI

A YOLO-based kitchen hygiene detection project for identifying PPE compliance and hygiene violations in food service environments.

This project can detect classes such as apron, gloves, hairnet, mask, and missing PPE items. It includes training scripts, inference scripts, and model output folders ready to use after cloning the repository.

## Features

- Detect PPE and compliance violations in kitchen images
- Run inference on single images or folders
- Train a YOLO model using the included dataset configuration
- Use the generated model weights for deployment or further testing
- Includes a simple FastAPI inference server for image uploads

## Model files to keep

The most important model file is:

```text
inference_outputs/kitchen-hygiene-final/weights/best.pt
```

Keep this file together with the project config and dataset config if you want to reuse the trained model later.

The default inference script points to this model automatically:

```python
PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-final" / "weights" / "best.pt"
```

## Prerequisites

- Python 3.10 or newer
- pip
- A GPU is optional, but CUDA is supported if available
- Windows, macOS, or Linux

## Quick start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd kitchen-hygiene-ai
```

### 2. Create and activate a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Run inference on an image

The project includes a ready-to-use inference script.

```bash
python scripts/predict_image.py
```

This uses the default model path and default validation image directory.

To run on a specific model or folder:

```bash
python scripts/predict_image.py --model inference_outputs/kitchen-hygiene-final/weights/best.pt --source dataset/valid/images
```

You can also change the confidence threshold:

```bash
python scripts/predict_image.py --conf 0.30 --iou 0.50
```

## Run training

If you want to retrain the model from scratch:

```bash
python scripts/train.py
```

Optional arguments:

```bash
python scripts/train.py --model yolo11n.pt --epochs 100 --imgsz 640 --batch 8 --device auto
```

The training script stores output in:

```text
inference_outputs/
```

You can view the generated run folders under:

```text
inference_outputs/kitchen-hygiene-final/
inference_outputs/kitchen-hygiene-gpu/
```

## Run the API server

The project includes an inference API built with FastAPI.

```bash
python -m uvicorn scripts.server:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

```text
http://localhost:8000/docs
```

The server loads the trained model automatically from the final weights folder.

## Dataset config

The dataset configuration file is located at:

```text
dataset/data.yaml
```

It contains the class names used in the model:

```yaml
nc: 7
names: ['apron', 'gloves', 'hairnet', 'mask', 'no_apron', 'no_gloves', 'no_hairnet']
```

This file should be kept with the project so the model can correctly map class IDs to labels.

## Common commands

Train the model:

```bash
python scripts/train.py
```

Run image inference:

```bash
python scripts/predict_image.py
```

Run device GPU check:

```bash
python scripts/check_gpu.py
```

Check dataset structure:

```bash
python scripts/check_dataset.py
```

## Troubleshooting

### Model not found

If you see a file-not-found error, verify the weight file exists:

```bash
dir inference_outputs\kitchen-hygiene-final\weights
```

### CUDA not working

Check GPU support with:

```bash
python scripts/check_gpu.py
```

### Dataset path issues

The repository uses relative paths in the dataset config, so it should work correctly when cloned to a different folder.

### Dependency issues

Reinstall the environment:

```bash
pip install -r requirements.txt
```

## Notes

- The base YOLO weights such as `yolo11n.pt` are not the final trained model.
- The actual trained checkpoint to use for prediction is `inference_outputs/kitchen-hygiene-final/weights/best.pt`.
- Always keep the model output directory and dataset config together when moving the project.
- Vercel site works only to show the frontend and was used for prototype demonstrtion.
- Model runs perfectly in your own system locally because it requires proper environment to run.

## License

This project is intended for educational and research use. Please ensure your organization has the right permissions before using the model in a production or commercial environment. Milind Did It