import zipfile
import xml.etree.ElementTree as ET
from generate_plannings_db import (
    build_spatial_grid, load_style_colors, find_days_row, find_coach_row,
    get_time_for_row, is_cell_origin, build_column_slots, effective_max_col
)

def debug_file(name):
    fp = rf"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\{name}"
    with zipfile.ZipFile(fp) as z:
        root = ET.fromstring(z.read("content.xml"))
    colors = load_style_colors(root)
    ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0"}
    for table in root.findall(".//table:table", ns):
        sn = table.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name")
        grid = build_spatial_grid(table, colors)
        dr = find_days_row(grid)
        cr = find_coach_row(grid, dr)
        mc = effective_max_col(grid, cr)
        slots = build_column_slots(grid, dr, mc)
        print(f"\n=== {name} / {sn} max_col={mc} slots={len(slots)} coach={cr} ===")
        for r in range(dr + 1, cr):
            ts = get_time_for_row(grid, r, 0)
            cells = []
            for c in sorted(grid[r].keys()):
                if c > mc:
                    continue
                if is_cell_origin(grid, r, c):
                    m = grid[r][c]
                    day = slots.get(c, ("?", 0))[0]
                    cells.append(f"c{c}/{day}:{m['text'][:20]}")
            if cells or ts:
                print(f"  r{r} {ts}: {cells}")

debug_file("Ramonville projet planning Coachs rentrée 2026.ods")
debug_file("St Cyprien projet planning Coachs rentrée 2026.ods")
