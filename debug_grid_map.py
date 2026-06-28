import zipfile, xml.etree.ElementTree as ET
from generate_plannings_db import build_spatial_grid, load_style_colors, get_time_for_row, is_cell_origin

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
table = root.findall(".//table:table", ns)[0]
colors = load_style_colors(root)
grid = build_spatial_grid(table, colors)
rows = table.findall(".//table:table-row", ns)
for fi in [11, 12, 13]:
    row = rows[fi]
    t0 = ""
    for cell in row.findall("table:table-cell", ns):
        t0 = "".join("".join(p.itertext()) for p in cell.findall(".//text:p", ns))
        if t0:
            break
    print(f"findall row {fi} first_text={repr(t0[:30])}")
    # find grid row with this time
    for gr in range(len(grid)):
        ts = get_time_for_row(grid, gr, 0)
        if ts and ("19h45" in ts or "20h" in ts or "18h40" in ts):
            origins = [(c, grid[gr][c]["text"][:25]) for c in sorted(grid[gr]) if is_cell_origin(grid, gr, c) and grid[gr][c].get("text")]
            if origins:
                print(f"  -> grid row {gr} time={ts} origins={origins[:6]}")
