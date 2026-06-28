import re
import os
from collections import Counter, defaultdict
from generate_plannings_db import parse_ods_file, GYM_MAPPING

PLANNINGS_DIR = os.environ.get(
    "PLANNINGS_SOURCE_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"),
)
JS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "data", "plannings.js")

with open(JS_FILE, "r", encoding="utf-8") as f:
    content = f.read()

salles = re.findall(r'salle: "([^"]+)"', content)
print("=== Sessions in plannings.js per salle ===")
for k, v in sorted(Counter(salles).items()):
    print(f"  {k}: {v}")

all_sessions = []
file_sessions = defaultdict(list)
for filename in sorted(os.listdir(PLANNINGS_DIR)):
    if not filename.endswith(".ods"):
        continue
    fp = os.path.join(PLANNINGS_DIR, filename)
    in_mapping = filename in GYM_MAPPING
    try:
        sessions = parse_ods_file(fp, filename)
    except Exception as e:
        print(f"ERROR parsing {filename}: {e}")
        continue
    all_sessions.extend(sessions)
    for s in sessions:
        file_sessions[s["salle"]].append(s)
    print(f"\nFile: {filename.encode('ascii','replace').decode()} | in_mapping={in_mapping} | sessions={len(sessions)}")

print("\n=== Parsed from ODS per salle ===")
for k in sorted(file_sessions):
    print(f"  {k}: {len(file_sessions[k])}")

print("\n=== ETATS UNIS overlapping day/time (3 sheets -> 1 gym) ===")
eu = file_sessions.get("etats-unis", [])
by_dt = defaultdict(list)
for s in eu:
    by_dt[(s["day"], s["timeSlot"])].append(f"{s['activity']} ({s['coach']})")
dups = {k: v for k, v in by_dt.items() if len(v) > 1}
for k, v in sorted(dups.items()):
    print(f"  {k[0]} {k[1]}: {v}")
print(f"  Total overlapping slots: {len(dups)}")

print("\n=== Ramonville unique activities ===")
ram = file_sessions.get("ramonville", [])
print(sorted(set(s["activity"] for s in ram)))

print("\n=== Portet combat vs mma activity split ===")
for gid in ("portet-combat", "portet-mma"):
    acts = sorted(set(s["activity"] for s in file_sessions.get(gid, [])))
    print(f"  {gid}: {acts}")

print("\n=== ODS files not in GYM_MAPPING ===")
for f in os.listdir(PLANNINGS_DIR):
    if f.endswith(".ods") and f not in GYM_MAPPING:
        print(f"  EXTRA: {f}")

print("\n=== GYM_MAPPING files missing on disk ===")
for f in GYM_MAPPING:
    if not os.path.exists(os.path.join(PLANNINGS_DIR, f)):
        print(f"  MISSING: {f}")

print("\n=== PDFs without matching ODS in gyms list ===")
pdfs = [f for f in os.listdir(PLANNINGS_DIR) if f.endswith(".pdf")]
for p in pdfs:
    print(f"  {p}")
