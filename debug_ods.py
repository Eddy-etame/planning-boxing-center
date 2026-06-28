import zipfile
import xml.etree.ElementTree as ET
import os

files = {
    "minimes": "Barrière de Paris projet Coachs planning rentrée 2026 V1.ods",
    "etats-unis": "ETATS UNIS projet planning Coachs rentrée 2026.ods",
    "ramonville": "Ramonville projet planning Coachs rentrée 2026.ods",
    "saint-cyprien": "St Cyprien projet planning Coachs rentrée 2026 (1).ods"
}
base_dir = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings"

def dump_cell(gym_id, search_text):
    path = os.path.join(base_dir, files[gym_id])
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
        c = 0
        for cell in row.findall('table:table-cell', ns):
            repeat = int(cell.get(f"{{{ns['table']}}}number-columns-repeated", "1"))
            texts = []
            for p in cell.findall('text:p', ns):
                if p.text: texts.append(p.text)
                for child in p:
                    if child.tail: texts.append(child.tail)
            if texts:
                val = "".join(texts)
                if val.strip() == search_text or val.startswith(search_text):
                    print(f"{gym_id} -> row {r}, col {c}: '{val}'")
            c += repeat

print("Dumping L...")
dump_cell("etats-unis", "L")
dump_cell("ramonville", "L")
print("Dumping F...")
dump_cell("minimes", "F")
print("Dumping ¨¨...")
dump_cell("minimes", "¨")
print("Dumping GRAPPLING...")
dump_cell("saint-cyprien", "GRAPPLING")
