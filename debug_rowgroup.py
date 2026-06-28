import zipfile, xml.etree.ElementTree as ET

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
ns = {"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0", "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
with zipfile.ZipFile(fp) as z:
    root = ET.fromstring(z.read("content.xml"))
table = root.findall(".//table:table", ns)[0]
for i, child in enumerate(table):
    tag = child.tag.split("}")[-1]
    print(f"child {i}: {tag}")
    if tag == "table-row-group":
        for j, row in enumerate(child):
            rt = row.tag.split("}")[-1]
            t0 = ""
            for cell in row.findall("table:table-cell", ns) + row.findall("table:covered-table-cell", ns):
                t = "".join("".join(p.itertext()) for p in cell.findall(".//text:p", ns))
                if t:
                    t0 = t[:30]
                    break
            vis = row.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}visibility", "")
            print(f"  group row {j} {rt} vis={vis} first_text={repr(t0)}")
