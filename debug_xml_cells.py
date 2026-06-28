import zipfile, xml.etree.ElementTree as ET

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
table = root.findall(".//table:table", ns)[0]
for r in [11, 12, 13, 14]:
    row = table.findall("table:table-row", ns)[r]
    print(f"\n=== XML ROW {r} ===")
    c = 0
    for cell in row:
        tag = cell.tag.split("}")[-1]
        if tag not in ("table-cell", "covered-table-cell"):
            continue
        rep = int(cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated") or 1)
        texts = ["".join(p.itertext()) for p in cell.findall(".//text:p", ns)]
        val = " | ".join(texts)
        style = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}style-name", "")
        rs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-spanned", "1")
        cs = cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-spanned", "1")
        print(f"  col~{c} {tag} rep={rep} rs={rs} cs={cs} style={style} text={repr(val)}")
        c += rep
