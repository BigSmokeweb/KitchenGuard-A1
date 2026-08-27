import csv

runs = [
    ('Baseline 1: YOLOv11 Nano (Initial)', 'e:/kitchen-hygiene-ai/inference_outputs/kitchen-hygiene-gpu/results.csv'),
    ('Champion: YOLOv11 Small (kitchen-hygiene-v2-s)', 'e:/kitchen-hygiene-ai/inference_outputs/kitchen-hygiene-v2-s/results.csv'),
    ('YOLOv11 Medium 800px (kitchen-hygiene-v3-m)', 'e:/kitchen-hygiene-ai/inference_outputs/kitchen-hygiene-v3-m/results.csv')
]

for name, path in runs:
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        cleaned = []
        for r in rows:
            clean_r = {}
            for k, v in r.items():
                k_clean = k.strip()
                v_clean = v.strip()
                if v_clean != 'nan' and v_clean != '':
                    try:
                        clean_r[k_clean] = float(v_clean)
                    except ValueError:
                        clean_r[k_clean] = v_clean
            if 'metrics/mAP50(B)' in clean_r:
                cleaned.append(clean_r)
        
        best = max(cleaned, key=lambda x: x.get('metrics/mAP50(B)', 0))
        print(f"=== {name} ===")
        print(f"Best Epoch:    {int(best.get('epoch', 0))}")
        print(f"Precision:     {best.get('metrics/precision(B)', 0)*100:.2f}%")
        print(f"Recall:        {best.get('metrics/recall(B)', 0)*100:.2f}%")
        print(f"mAP@0.50:      {best.get('metrics/mAP50(B)', 0)*100:.2f}%")
        print(f"mAP@0.50:0.95: {best.get('metrics/mAP50-95(B)', 0)*100:.2f}%\n")
