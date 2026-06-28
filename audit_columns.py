import os
from collections import defaultdict
from generate_plannings_db import parse_ods_file, GYM_MAPPING

PLANNINGS_DIR = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings"

# Check minimes lundi 19h40 - ODS has 3 sub-columns with different activities
for filename in os.listdir(PLANNINGS_DIR):
    if "Minimes" in filename or "Barri" in filename:
        fp = os.path.join(PLANNINGS_DIR, filename)
        if not filename.endswith(".ods"):
            continue
        sessions = parse_ods_file(fp, filename)
        monday_1940 = [s for s in sessions if s["day"] == "lundi" and "19h40" in s["timeSlot"]]
        print("Minimes lundi ~19h40 sessions parsed:", len(monday_1940))
        for s in monday_1940:
            print(f"  {s['timeSlot']} | {s['activity']} | {s['coach']}")

        # All lundi sessions
        print("\nAll Minimes lundi:")
        for s in sorted([x for x in sessions if x["day"] == "lundi"], key=lambda x: x["timeSlot"]):
            print(f"  {s['timeSlot']} | {s['activity']} | {s['coach']}")

# Etats-unis: how many per sheet if we tag them
print("\n=== Etats Unis per sheet (manual) ===")
import zipfile
import xml.etree.ElementTree as ET
from generate_plannings_db import clean_activity, clean_coach_name, COACH_COLORS_MAP

fp = os.path.join(PLANNINGS_DIR, "ETATS UNIS projet planning Coachs rentrée 2026.ods")
# just count sheets
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
    ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0"}
    for t in root.findall(".//table:table", ns):
        print(" Sheet:", t.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name"))

# Ramonville mardi evening - ODS row 10-11 has GRAPPLING + ASSO MMA same day different times
print("\n=== Ramonville mardi evening ===")
fp = os.path.join(PLANNINGS_DIR, "Ramonville projet planning Coachs rentrée 2026.ods")
sessions = parse_ods_file(fp, "Ramonville projet planning Coachs rentrée 2026.ods")
for s in sorted([x for x in sessions if x["day"] == "mardi"], key=lambda x: x["timeSlot"]):
    print(f"  {s['timeSlot']} | {s['activity']} | {s['coach']}")
