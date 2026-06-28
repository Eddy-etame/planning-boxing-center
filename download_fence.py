import urllib.request
import os

url = "https://boxingcenter.fr/wp-content/uploads/2024/03/entrainement-mma-plannings-club-boxe-toulouse.webp"
dest = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\public\header-bg.png"

try:
    print(f"Downloading clean fence banner from {url}...")
    urllib.request.urlretrieve(url, dest)
    print(f"Clean fence banner saved to {dest} successfully!")
except Exception as e:
    print(f"Error: {e}")
