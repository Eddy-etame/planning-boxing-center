import os
from collections import Counter
from generate_plannings_db import (
    find_mapped_files, parse_ods_file, GYM_MAPPING, build_spatial_grid,
    find_days_row, build_column_slots, grid_max_col, load_style_colors,
    get_time_for_row, is_cell_origin, clean_activity
)
import zipfile
import xml.etree.ElementTree as ET

PL = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings"

def dump_sheet(path, mapping_key, sheet_filter=None):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("content.xml"))
    colors = load_style_colors(root)
    ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0"}
    mapping = GYM_MAPPING[mapping_key]
    for table in root.findall(".//table:table", ns):
        sn = table.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name")
        if sn not in mapping:
            continue
        if sheet_filter and sn != sheet_filter:
            continue
        grid = build_spatial_grid(table, colors)
        dr = find_days_row(grid)
        mc = grid_max_col(grid)
        slots = build_column_slots(grid, dr, mc)
        print(f"\n=== {mapping_key} / {sn} ===")
        print(f"  rows={len(grid)} days_row={dr} max_col={mc} slots={len(slots)}")
        print(f"  subColumns:", Counter(d for d,_ in slots.values()))
        sessions, _ = parse_ods_file(path, mapping_key, colors)
        gym = mapping[sn]
        gs = [s for s in sessions if s["salle"]==gym]
        print(f"  sessions={len(gs)}")
        for s in sorted(gs, key=lambda x: (x["day"], x["timeSlot"], x.get("subColumn",0))):
            print(f"    {s['day']} sc={s.get('subColumn',0)} {s['timeSlot']} | {s['activity'][:40]} | {s['coach']}")

file_map = find_mapped_files()
for actual, key in file_map.items():
    if "Ramonville" in key or "ETATS" in key or "Minimes" in key or "Barri" in key:
        dump_sheet(os.path.join(PL, actual), key)

# Check missing vs ods_output expectations
print("\n=== CHECKS ===")
checks = [
    ("minimes", "HYROX"),
    ("minimes", "BOXE PRO"),
    ("saint-cyprien", "MUAY"),
    ("ramonville", "ANGLAISE CONFIRMES"),
    ("etats-unis-boxe", "BOXE ANGLAISE"),
    ("etats-unis-fitness", "HYROX"),
]
from generate_plannings_db import find_mapped_files, parse_ods_file
all_s = []
for actual, key in find_mapped_files().items():
    s, _ = parse_ods_file(os.path.join(PL, actual), key, {})
    all_s.extend(s)
for gym, term in checks:
    hits = [x for x in all_s if x["salle"]==gym and term in x["activity"]]
    print(f"  {gym} / {term}: {len(hits)} {[(h['day'], h['timeSlot']) for h in hits[:3]]}")
