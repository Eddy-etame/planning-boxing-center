import zipfile
import xml.etree.ElementTree as ET
import os

path = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(path, 'r') as z:
    content = z.read('content.xml')
    styles = z.read('styles.xml')
root = ET.fromstring(content)
ns = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
    'style': 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
    'fo': 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0'
}

style_colors = {}
for root_xml in [ET.fromstring(content), ET.fromstring(styles)]:
    for auto_styles in root_xml.findall('.//office:automatic-styles', ns):
        for style in auto_styles.findall('style:style', ns):
            name = style.get(f"{{{ns['style']}}}name")
            cell_props = style.find('style:table-cell-properties', ns)
            if cell_props is not None:
                color = cell_props.get(f"{{{ns['fo']}}}background-color")
                if color:
                    style_colors[name] = color.lower()

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
            if "19H45" in val.upper() or "ANGLAISE LOISIRS" in val.upper():
                style_name = cell.get(f"{{{ns['table']}}}style-name")
                color = style_colors.get(style_name, "no-color")
                print(f"Ramonville -> row {r}, col {c}: '{val}' | Color: {color}")
        c += repeat
