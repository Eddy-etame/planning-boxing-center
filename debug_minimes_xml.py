import zipfile
import xml.etree.ElementTree as ET

path = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Barrière de Paris projet Coachs planning rentrée 2026 V1.ods"
with zipfile.ZipFile(path, 'r') as z:
    content = z.read('content.xml')
root = ET.fromstring(content)
ns = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
}
sheet = root.find('office:body/office:spreadsheet/table:table', ns)
for r, row in enumerate(sheet.findall('table:table-row', ns)):
    if r in (1, 10, 11):
        print(f"\n--- ROW {r} ---")
        for i, cell in enumerate(row.findall('./*', ns)):
            tag = cell.tag.split('}')[-1]
            if tag not in ('table-cell', 'covered-table-cell'): continue
            repeat = int(cell.get(f"{{{ns['table']}}}number-columns-repeated", "1"))
            rs = int(cell.get(f"{{{ns['table']}}}number-rows-spanned", "1"))
            cs = int(cell.get(f"{{{ns['table']}}}number-columns-spanned", "1"))
            texts = ["".join(p.itertext()) for p in cell.findall('.//text:p', ns)]
            val = "".join(texts)
            print(f"Index {i}: <{tag}> repeat={repeat} rs={rs} cs={cs} text='{val}'")
