import zipfile, xml.etree.ElementTree as ET

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}

table = root.findall(".//table:table", ns)[0]
for r, row in enumerate(table.findall("table:table-row", ns)):
    cells = []
    for cell in row.findall("table:table-cell", ns) + row.findall("table:covered-table-cell", ns):
        tag = cell.tag.split("}")[-1]
        texts = ["".join(p.itertext()) for p in cell.findall(".//text:p", ns)]
        val = "".join(texts).strip()
        rs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-spanned", "1")
        cs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-spanned", "1")
        rep = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated", "1")
        if val or tag == "covered-table-cell":
            cells.append(f"{tag[0]}:{val[:25]} rs={rs} cs={cs} rep={rep}")
    if r >= 8 and r <= 15:
        print(f"XML row {r}: {' | '.join(cells[:12])}")
