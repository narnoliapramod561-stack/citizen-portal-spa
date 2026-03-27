"""Run: python seed.py  — seeds 20 demo entries for instant demo"""
import requests, random

BASE  = "http://localhost:8000"
TYPES = ["PET", "HDPE", "PVC", "LDPE", "PP", "PS", "Other"]

for _ in range(20):
    try:
        requests.post(f"{BASE}/submit-plastic", data={
            "lat":          round(random.uniform(28.50, 28.70), 5),
            "long":         round(random.uniform(77.10, 77.35), 5),
            "plastic_type": random.choice(TYPES),
        })
        print(".", end="", flush=True)
    except:
        pass
print("\nDone.")
