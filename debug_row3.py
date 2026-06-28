import zipfile
import xml.etree.ElementTree as ET

path = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\St Cyprien projet planning Coachs rentrée 2026 (1).ods"
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
    if r == 3:
        c = 0
        for cell in row.findall('table:table-cell', ns):
            repeat = int(cell.get(f"{{{ns['table']}}}number-columns-repeated", "1"))
            rs = int(cell.get(f"{{{ns['table']}}}number-rows-spanned", "1"))
            cs = int(cell.get(f"{{{ns['table']}}}number-columns-spanned", "1"))
            texts = ["".join(p.itertext()) for p in cell.findall('text:p', ns)]
            val = "".join(texts)
            print(f"Row {r}, col {c}, rs {rs}, cs {cs}: '{val}'")
            c += repeat
