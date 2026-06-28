"""Simulate legacy flat-row parser on Ramonville."""
import zipfile, xml.etree.ElementTree as ET, re

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
ns = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
table = root.findall(".//table:table", ns)[0]
for r, row in enumerate(table.findall("table:table-row", ns)):
    cells = []
    for cell in row.findall("./*", ns):
        tag = cell.tag.split("}")[-1]
        if tag not in ("table-cell", "covered-table-cell"):
            continue
        texts = ["".join(p.itertext()) for p in cell.findall(".//text:p", ns)]
        val = "".join(texts).strip()
        if tag == "covered-table-cell":
            val = f"[COV]{val}"
        rep = int(cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated") or 1)
        if rep > 50:
            continue
        rs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-spanned", "1")
        for _ in range(rep):
            cells.append(f"{val}[rs={rs}]" if val else "---")
    if 8 <= r <= 14:
        t0 = cells[0] if cells else ""
        acts = [c for c in cells[1:8] if c and c != "---" and "[COV]" not in c]
        print(f"flat row {r}: time={t0} acts={acts}")
