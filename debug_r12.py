import zipfile, xml.etree.ElementTree as ET
from generate_plannings_db import build_spatial_grid, load_style_colors, is_cell_origin

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
colors = load_style_colors(root)
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0"}
table = root.findall(".//table:table", ns)[0]
grid = build_spatial_grid(table, colors)
for r in range(10, 16):
    print(f"\nROW {r}:")
    for c in range(0, 20):
        if c in grid[r]:
            m = grid[r][c]
            orig = is_cell_origin(grid, r, c)
            if m.get("text") or orig:
                print(f"  c{c} orig={orig} rs={m['rs']} cs={m['cs']} text={repr(m['text'][:30])}")
