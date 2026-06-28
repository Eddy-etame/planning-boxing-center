import os
import shutil

# Kill node to avoid file lock
os.system("taskkill /F /IM node.exe")

src_logo = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\00_MARQUE\BC_Logo_Officiel_Transparent.png"
dest_logo = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\public\logo.png"

try:
    if os.path.exists(src_logo):
        shutil.copy2(src_logo, dest_logo)
        print(f"Successfully copied official logo to {dest_logo}!")
    else:
        print(f"Source logo not found at {src_logo}")
except Exception as e:
    print(f"Error copying logo: {e}")
