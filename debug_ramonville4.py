import json
from generate_plannings_db import parse_ods_file
import os

filepath = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Ramonville projet planning Coachs rentrée 2026.ods"
sessions = parse_ods_file(filepath, "Ramonville projet planning Coachs rentrée 2026.ods")
for s in sessions:
    print(s)
