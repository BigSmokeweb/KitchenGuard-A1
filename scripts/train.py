import argparse
from pathlib import Path

import torch
from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_CONFIG = PROJECT_ROOT / "dataset" / "data.yaml"
OUTPUT_DIR = PROJECT_ROOT / "inference_outputs"


def parse_args():
	parser = argparse.ArgumentParser(description="Train a YOLO model on the kitchen hygiene dataset.")
	parser.add_argument("--model", default="yolo11n.pt", help="Base model checkpoint.")
	parser.add_argument("--epochs", type=int, default=100)
	parser.add_argument("--imgsz", type=int, default=640)
	parser.add_argument("--batch", type=int, default=8)
	parser.add_argument("--workers", type=int, default=0)
	parser.add_argument("--device", default="auto", help="CUDA device, cpu, or auto.")
	parser.add_argument("--name", default="kitchen-hygiene")
	return parser.parse_args()


def main():
	args = parse_args()
	if not DATASET_CONFIG.exists():
		raise FileNotFoundError(f"Dataset config not found: {DATASET_CONFIG}")

	device = args.device
	if device == "auto":
		device = "0" if torch.cuda.is_available() else "cpu"

	model = YOLO(args.model)
	model.train(
		data=str(DATASET_CONFIG),
		epochs=args.epochs,
		imgsz=args.imgsz,
		batch=args.batch,
		workers=args.workers,
		device=device,
		project=str(OUTPUT_DIR),
		name=args.name,
		exist_ok=True,
	)


if __name__ == "__main__":
	main()
