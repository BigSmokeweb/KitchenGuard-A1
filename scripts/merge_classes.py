import os
from pathlib import Path
from collections import Counter
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_ROOT = PROJECT_ROOT / "dataset"
DATA_YAML = DATASET_ROOT / "data.yaml"

# Original classes: ['hairnet', 'hairnetless', 'mask', 'maskless', 'with_glove', 'with_gloves']
# Indices:
# 0: hairnet -> 0: hairnet
# 1: hairnetless -> 1: hairnetless
# 2: mask -> 2: mask
# 3: maskless -> 3: maskless
# 4: with_glove -> 4: gloves
# 5: with_gloves -> 4: gloves

NEW_CLASS_NAMES = ['hairnet', 'hairnetless', 'mask', 'maskless', 'gloves']
CLASS_MAP = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 4
}

def merge_classes():
    print("Starting class merge (with_glove + with_gloves -> gloves)...")
    total_relabelled = 0
    
    for split in ["train", "valid", "test"]:
        lbl_dir = DATASET_ROOT / split / "labels"
        if not lbl_dir.exists():
            continue
            
        counter_before = Counter()
        counter_after = Counter()
        
        for lbl_file in lbl_dir.glob("*.txt"):
            with open(lbl_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            new_lines = []
            modified = False
            for line in lines:
                parts = line.strip().split()
                if not parts:
                    continue
                old_cls = int(parts[0])
                counter_before[old_cls] += 1
                
                new_cls = CLASS_MAP.get(old_cls, old_cls)
                counter_after[new_cls] += 1
                
                if new_cls != old_cls:
                    modified = True
                    total_relabelled += 1
                
                new_line = f"{new_cls} " + " ".join(parts[1:]) + "\n"
                new_lines.append(new_line)
            
            if modified:
                with open(lbl_file, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                    
        print(f"\n--- {split.upper()} ---")
        print(f"Before merge: {dict(counter_before)}")
        print(f"After merge: {dict(counter_after)}")

    # Update data.yaml
    with open(DATA_YAML, "r", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)
        
    data_cfg["nc"] = len(NEW_CLASS_NAMES)
    data_cfg["names"] = NEW_CLASS_NAMES
    
    with open(DATA_YAML, "w", encoding="utf-8") as f:
        yaml.dump(data_cfg, f, sort_keys=False)
        
    print(f"\nUpdated {DATA_YAML} successfully with {len(NEW_CLASS_NAMES)} classes: {NEW_CLASS_NAMES}")
    print(f"Total annotations merged: {total_relabelled}")

if __name__ == "__main__":
    merge_classes()
