import os
from pathlib import Path
from collections import Counter
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_ROOT = PROJECT_ROOT / "dataset"
DATA_YAML = DATASET_ROOT / "data.yaml"

# Filter down to the 3 high-confidence PPE objects:
# 0: hairnet -> 0: hairnet
# 1: hairnetless -> DROP
# 2: mask -> 1: mask
# 3: maskless -> DROP
# 4: gloves -> 2: gloves

NEW_CLASSES = ['hairnet', 'mask', 'gloves']
KEEP_MAP = {
    0: 0,  # hairnet -> hairnet
    2: 1,  # mask -> mask
    4: 2   # gloves -> gloves
}

def clean_dataset_for_90_plus():
    print("Filtering dataset to concrete PPE targets ['hairnet', 'mask', 'gloves']...")
    total_kept = 0
    total_dropped = 0

    for split in ["train", "valid", "test"]:
        lbl_dir = DATASET_ROOT / split / "labels"
        if not lbl_dir.exists():
            continue

        counter = Counter()
        for lbl_file in lbl_dir.glob("*.txt"):
            with open(lbl_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

            new_lines = []
            for line in lines:
                parts = line.strip().split()
                if not parts:
                    continue
                old_cls = int(parts[0])
                if old_cls in KEEP_MAP:
                    new_cls = KEEP_MAP[old_cls]
                    counter[NEW_CLASSES[new_cls]] += 1
                    new_lines.append(f"{new_cls} " + " ".join(parts[1:]) + "\n")
                    total_kept += 1
                else:
                    total_dropped += 1

            with open(lbl_file, "w", encoding="utf-8") as f:
                f.writelines(new_lines)

        print(f"\n--- {split.upper()} ---")
        for cls_name, count in sorted(counter.items()):
            print(f"  {cls_name}: {count}")

    with open(DATA_YAML, "r", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    data_cfg["nc"] = len(NEW_CLASSES)
    data_cfg["names"] = NEW_CLASSES

    with open(DATA_YAML, "w", encoding="utf-8") as f:
        yaml.dump(data_cfg, f, sort_keys=False)

    print(f"\n✅ Cleaned {DATA_YAML}: {NEW_CLASSES}")
    print(f"Kept instances: {total_kept} | Dropped noisy absence boxes: {total_dropped}")

if __name__ == "__main__":
    clean_dataset_for_90_plus()
