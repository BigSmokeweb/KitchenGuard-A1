import argparse
import time
from pathlib import Path

import torch
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = (
    PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-model" / "weights" / "best.pt"
)
DEFAULT_SOURCE = PROJECT_ROOT / "dataset" / "valid" / "images"


def main():
    parser = argparse.ArgumentParser(
        description="KitchenGuard AI - Object Detection CLI"
    )
    parser.add_argument(
        "source",
        nargs="?",
        default=str(DEFAULT_SOURCE),
        help="Image, video, or folder path",
    )
    parser.add_argument(
        "--model", default=str(DEFAULT_MODEL), help="Path to .pt or .onnx model weights"
    )
    parser.add_argument(
        "--conf", type=float, default=0.25, help="Confidence threshold (0.0 - 1.0)"
    )
    parser.add_argument("--iou", type=float, default=0.45, help="NMS IOU threshold")
    parser.add_argument(
        "--device",
        default="0" if torch.cuda.is_available() else "cpu",
        help="Device (0 for GPU, cpu for CPU)",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        default=True,
        help="Save annotated prediction images",
    )
    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    print(f"Inference device: {args.device}")
    model = YOLO(args.model, task="detect")

    t0 = time.time()
    results = model.predict(
        source=args.source,
        conf=args.conf,
        iou=args.iou,
        device=args.device,
        save=args.save,
        project=str(PROJECT_ROOT / "inference_outputs"),
        name="test_images",
        exist_ok=True,
    )
    t1 = time.time()
    print(f"\nInference completed in {round((t1 - t0) * 1000, 1)} ms")
    print(
        f"Annotated results saved to: {PROJECT_ROOT / 'inference_outputs' / 'test_images'}\n"
    )


if __name__ == "__main__":
    main()
