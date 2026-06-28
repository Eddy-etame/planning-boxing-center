import json
from generate_plannings_db import parse_ods_file
import os

filepath = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\Barrière de Paris projet Coachs planning rentrée 2026 V1.ods"
sessions = parse_ods_file(filepath, "Barrière de Paris projet Coachs planning rentrée 2026 V1.ods")
for s in sessions:
    if s["day"] == "mardi" and s["timeSlot"] == "18h30- 19h30":
        print(s)
