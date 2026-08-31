from collections import Counter
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_ROOT = PROJECT_ROOT / "dataset"

with open(DATASET_ROOT / "data.yaml", "r") as f:
    data_cfg = yaml.safe_load(f)

class_names = data_cfg["names"]
print(f"Classes ({len(class_names)}): {class_names}\n")

for split in ["train", "valid", "test"]:
    img_dir = DATASET_ROOT / split / "images"
    lbl_dir = DATASET_ROOT / split / "labels"

    if not img_dir.exists():
        print(f"[{split}] MISSING image folder: {img_dir}")
        continue

    images = list(img_dir.glob("*.*"))
    labels = list(lbl_dir.glob("*.txt"))

    # Check for images with no matching label file (common annotation gap)
    image_stems = {p.stem for p in images}
    label_stems = {p.stem for p in labels}
    missing_labels = image_stems - label_stems
    orphan_labels = label_stems - image_stems

    # Count class occurrences (checks class imbalance)
    class_counter = Counter()
    empty_label_files = 0
    for lbl_file in labels:
        with open(lbl_file, "r") as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]
        if not lines:
            empty_label_files += 1
        for line in lines:
            class_id = int(line.split()[0])
            class_counter[class_id] += 1

    print(f"--- {split.upper()} ---")
    print(f"  Images: {len(images)}   Labels: {len(labels)}")
    print(f"  Images missing a label file: {len(missing_labels)}")
    print(f"  Orphan label files (no matching image): {len(orphan_labels)}")
    print(f"  Empty label files (no annotations): {empty_label_files}")
    print(f"  Class distribution:")
    for class_id, count in sorted(class_counter.items()):
        name = (
            class_names[class_id]
            if class_id < len(class_names)
            else f"UNKNOWN({class_id})"
        )
        print(f"    {name}: {count}")
    print()
