import zipfile
import xml.etree.ElementTree as ET
import os

path = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\St Cyprien projet planning Coachs rentrée 2026 (1).ods"
with zipfile.ZipFile(path, 'r') as z:
    content = z.read('content.xml')
root = ET.fromstring(content)
ns = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
}
spreadsheet = root.find('office:body/office:spreadsheet', ns)
sheet = spreadsheet.findall('table:table', ns)[0]

for r, row in enumerate(sheet.findall('table:table-row', ns)):
    if r == 1 or r == 2:
        c = 0
        for cell in row.findall('table:table-cell', ns):
            repeat = int(cell.get(f"{{{ns['table']}}}number-columns-repeated", "1"))
            span_str = cell.get(f"{{{ns['table']}}}number-columns-spanned", "1")
            span = int(span_str)
            texts = []
            for p in cell.findall('text:p', ns):
                if p.text: texts.append(p.text)
                for child in p:
                    if child.tail: texts.append(child.tail)
            if texts:
                val = "".join(texts)
                if any(d in val.upper() for d in ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"]):
                    print(f"St Cyprien -> row {r}, col {c}, span {span}, repeat {repeat}: '{val}'")
            c += repeat
