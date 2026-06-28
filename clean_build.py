import shutil
import os

next_dir = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\.next"

if os.path.exists(next_dir):
    try:
        shutil.rmtree(next_dir)
        print("Successfully deleted .next directory!")
    except Exception as e:
        print(f"Error deleting .next: {e}")
else:
    print(".next directory does not exist, nothing to clean.")
