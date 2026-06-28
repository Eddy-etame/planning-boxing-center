import zipfile
import xml.etree.ElementTree as ET

filepath = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(filepath, 'r') as z:
    content = z.read('content.xml')
root = ET.fromstring(content)
ns = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'style': 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
    'fo': 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
}
style_colors = {}
for style in root.findall(".//style:style", ns):
    name = style.get(f"{{{ns['style']}}}name")
    properties = style.find("style:table-cell-properties", ns)
    if properties is not None:
        bg_color = properties.get(f"{{{ns['fo']}}}background-color")
        if bg_color:
            style_colors[name] = bg_color.lower()

sheet = root.find('office:body/office:spreadsheet/table:table', ns)
for r, row in enumerate(sheet.findall('table:table-row', ns)):
    if r in (9, 10, 11):
        print(f"\n--- ROW {r} ---")
        for i, cell in enumerate(row.findall('./*', ns)):
            tag = cell.tag.split('}')[-1]
            if tag not in ('table-cell', 'covered-table-cell'): continue
            repeat = int(cell.get(f"{{{ns['table']}}}number-columns-repeated", "1"))
            rs = int(cell.get(f"{{{ns['table']}}}number-rows-spanned", "1"))
            cs = int(cell.get(f"{{{ns['table']}}}number-columns-spanned", "1"))
            texts = ["".join(p.itertext()) for p in cell.findall('.//text:p', ns)]
            val = "".join(texts)
            style_name = cell.get(f"{{{ns['table']}}}style-name", "")
            color = style_colors.get(style_name, "")
            if repeat > 50:
                continue
            print(f"  [{i}] <{tag}> repeat={repeat} rs={rs} cs={cs} text='{val}' color='{color}'")
