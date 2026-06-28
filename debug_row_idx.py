import zipfile, xml.etree.ElementTree as ET

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
table = root.findall(".//table:table", ns)[0]
rows = table.findall("table:table-row", ns)
for r in [12, 13, 14]:
    row = rows[r]
    print(f"\n=== ET row {r} ===")
    for i, cell in enumerate(row):
        tag = cell.tag.split("}")[-1]
        if tag not in ("table-cell", "covered-table-cell"):
            continue
        t = "".join("".join(p.itertext()) for p in cell.findall(".//text:p", ns)).strip()
        rs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-spanned", "1")
        cs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-spanned", "1")
        rep = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated", "1")
        if t or tag == "table-cell":
            print(f"  cell{i} {tag} rep={rep} rs={rs} cs={cs} t={repr(t[:50])}")
