import zipfile
import xml.etree.ElementTree as ET

filepath = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(filepath, 'r') as z:
    content = z.read('content.xml')
root = ET.fromstring(content)
ns = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
}

sheet = root.find('office:body/office:spreadsheet/table:table', ns)
for r, row in enumerate(sheet.findall('table:table-row', ns)):
    for cell in row.findall('./*', ns):
        tag = cell.tag.split('}')[-1]
        if tag not in ('table-cell', 'covered-table-cell'): continue
        texts = ["".join(p.itertext()) for p in cell.findall('.//text:p', ns)]
        val = "".join(texts).strip()
        if "19h45" in val:
            print(f"Row {r}: '{val}'")
