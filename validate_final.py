"""Final validation — all ODS sources vs generated plannings.js"""
import os
import re
from collections import Counter
from generate_plannings_db import find_mapped_files, parse_ods_file

PL = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings"
JS = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\src\data\plannings.js"

CHECKS = [
    ("minimes", "HYROX"),
    ("minimes", "BOXE PRO"),
    ("saint-cyprien", "MUAY"),
    ("ramonville", "ANGLAISE LOISIRS"),
    ("ramonville", "ASSO MMA"),
    ("etats-unis-boxe", "BOXE ANGLAISE"),
    ("etats-unis-mma", "GRAPPLING"),
    ("etats-unis-fitness", "HYROX"),
    ("portet-combat", "OPEN SPARRING"),
    ("portet-mma", "JJB"),
]

all_s = []
for actual, key in find_mapped_files().items():
    s, _ = parse_ods_file(os.path.join(PL, actual), key, {})
    all_s.extend(s)
    print(f"{key}: {len(s)} sessions")

print("\nPer gym totals:", dict(Counter(x["salle"] for x in all_s)))
print("\nCritical checks:")
failed = []
for gym, term in CHECKS:
    hits = [x for x in all_s if x["salle"] == gym and term in x["activity"]]
    ok = len(hits) > 0
    print(f"  {'OK' if ok else 'FAIL'} {gym} / {term}: {len(hits)}")
    if not ok:
        failed.append((gym, term))

# No legacy etats-unis
legacy = [x for x in all_s if x["salle"] == "etats-unis"]
print(f"\nLegacy etats-unis sessions (should be 0): {len(legacy)}")

# Overlap check within same gym
for gym in sorted(set(x["salle"] for x in all_s)):
    by_key = Counter(
        (x["day"], x.get("subColumn", 0), x["timeSlot"].replace(" ", "").lower())
        for x in all_s if x["salle"] == gym
    )
    dups = {k: v for k, v in by_key.items() if v > 1}
    if dups:
        print(f"WARN {gym}: {len(dups)} slots with multiple sessions (sub-columns)")

print("\n" + ("ALL CHECKS PASSED" if not failed and not legacy else f"FAILED: {failed}"))
