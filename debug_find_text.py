import zipfile, re

fp = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
with zipfile.ZipFile(fp) as z:
    xml = z.read("content.xml").decode("utf-8")
start = xml.find('table:name="Feuille1"')
end = xml.find("</table:table>", start)
chunk = xml[start:end]
rows = chunk.split("<table:table-row")
for i, row in enumerate(rows[1:], 0):
    hdr = row[:120].replace("\n", " ")
    rep = re.search(r'number-rows-repeated="(\d+)"', row[:200])
    rep = rep.group(1) if rep else "1"
    marker = " <<<" if "19h45" in row else ""
    print(f"raw {i} row_repeat={rep}{marker}: {hdr[:100]}")
