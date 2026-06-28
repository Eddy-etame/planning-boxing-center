import shutil
import os

src_logo = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\00_MARQUE\BC_Logo_Officiel_Transparent.png"
dest_dir = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\public"

dests = [
    os.path.join(dest_dir, "logo.png"),
    os.path.join(dest_dir, "favicon.png"),
    os.path.join(dest_dir, "favicon.ico")
]

if os.path.exists(src_logo):
    for d in dests:
        try:
            shutil.copy2(src_logo, d)
            print(f"Copied to {d} successfully!")
        except Exception as e:
            print(f"Error copying to {d}: {e}")
else:
    print(f"Source not found: {src_logo}")
