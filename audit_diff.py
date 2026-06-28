import os
import re
from collections import defaultdict
from generate_plannings_db import parse_ods_file, GYM_MAPPING

PLANNINGS_DIR = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings"
JS_FILE = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\src\data\plannings.js"

def load_js_sessions():
    with open(JS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    blocks = re.findall(
        r'\{\s*id: "([^"]+)",\s*salle: "([^"]+)",\s*period: "([^"]+)",\s*day: "([^"]+)",\s*timeSlot: "([^"]+)",\s*activity: "([^"]+)",\s*coach: "([^"]+)"',
        content,
    )
    return [
        {"id": b[0], "salle": b[1], "period": b[2], "day": b[3], "timeSlot": b[4], "activity": b[5], "coach": b[6]}
        for b in blocks
    ]

js = [s for s in load_js_sessions() if s["period"] == "rentree-2026"]
ods = []
for filename in os.listdir(PLANNINGS_DIR):
    if filename.endswith(".ods") and filename in GYM_MAPPING:
        ods.extend(parse_ods_file(os.path.join(PLANNINGS_DIR, filename), filename))

def key(s):
    return (s["salle"], s["day"], s["timeSlot"].replace(" ", "").lower(), s["activity"].upper())

js_keys = defaultdict(list)
ods_keys = defaultdict(list)
for s in js:
    js_keys[key(s)].append(s)
for s in ods:
    ods_keys[key(s)].append(s)

print("=== In JS but NOT in fresh ODS parse ===")
for k in sorted(set(js_keys) - set(ods_keys)):
    for s in js_keys[k]:
        print(f"  {s['salle']} | {s['day']} | {s['timeSlot']} | {s['activity']} | {s['coach']}")

print("\n=== In ODS but NOT in JS ===")
for k in sorted(set(ods_keys) - set(js_keys)):
    for s in ods_keys[k]:
        print(f"  {s['salle']} | {s['day']} | {s['timeSlot']} | {s['activity']} | {s['coach']}")

print("\n=== Activity name variants (same gym, similar names) ===")
by_gym = defaultdict(set)
for s in ods:
    by_gym[s["salle"]].add(s["activity"])
for gym, acts in sorted(by_gym.items()):
    print(f"\n{gym}:")
    for a in sorted(acts):
        print(f"  - {a}")

print("\n=== Ramonville: sessions with GRAPPLING or ASSO MMA (would be MMA room at Portet?) ===")
for s in ods:
    if s["salle"] == "ramonville" and any(x in s["activity"] for x in ("GRAPPLING", "ASSO MMA", "JJB", "KICK")):
        print(f"  {s['day']} {s['timeSlot']}: {s['activity']} ({s['coach']})")

print("\n=== Minimes: check multi-subcolumn parsing (lundi has cs=3) ===")
minimes = [s for s in ods if s["salle"] == "minimes"]
by_day = defaultdict(int)
for s in minimes:
    by_day[s["day"]] += 1
print("  sessions per day:", dict(by_day))

print("\n=== Saint-Cyprien: sessions per day ===")
sc = [s for s in ods if s["salle"] == "saint-cyprien"]
by_day = defaultdict(int)
for s in sc:
    by_day[s["day"]] += 1
print("  ODS:", dict(by_day))
sc_js = [s for s in js if s["salle"] == "saint-cyprien"]
by_day = defaultdict(int)
for s in sc_js:
    by_day[s["day"]] += 1
print("  JS:", dict(by_day))

print("\n=== rowSpan stored but UI uses .find() - cells with rowspan lose sibling rows ===")
rowspan_sessions = [s for s in js if "rowSpan" in open(JS_FILE).read()]  # skip
# count duplicate day+time in same gym (UI would show only first)
for gym in sorted(set(s["salle"] for s in js)):
    by_dt = defaultdict(list)
    for s in js:
        if s["salle"] == gym:
            by_dt[(s["day"], s["timeSlot"].replace(" ", "").lower())].append(s["activity"])
    dups = {k: v for k, v in by_dt.items() if len(v) > 1}
    if dups:
        print(f"\n  {gym}: {len(dups)} slots with multiple activities")
        for k, v in list(sorted(dups.items()))[:8]:
            print(f"    {k}: {v}")
