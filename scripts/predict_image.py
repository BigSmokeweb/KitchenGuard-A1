import argparse
from pathlib import Path

from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = PROJECT_ROOT / "inference_outputs" / "kitchen-hygiene-gpu" / "weights" / "best.pt"
DEFAULT_SOURCE = PROJECT_ROOT / "dataset" / "valid" / "images"


def main():
    parser = argparse.ArgumentParser(description="Run kitchen hygiene object detection.")
    parser.add_argument("source", nargs="?", default=str(DEFAULT_SOURCE))
    parser.add_argument("--model", default=str(DEFAULT_MODEL))
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--iou", type=float, default=0.45)
    parser.add_argument("--device", default="0")
    args = parser.parse_args()

    model = YOLO(args.model)
    results = model.predict(
        source=args.source,
        conf=args.conf,
        iou=args.iou,
        device=args.device,
        save=True,
        project=str(PROJECT_ROOT / "inference_outputs"),
        name="test_images",
        exist_ok=True,
    )

    for result in results:
        print(result.boxes)


if __name__ == "__main__":
    main()