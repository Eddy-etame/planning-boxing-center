import urllib.request
import os

dest_dir = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\public"
os.makedirs(dest_dir, exist_ok=True)

# 1. Download official site logo
logo_url = "https://boxingcenter.fr/wp-content/uploads/2024/03/cropped-club-de-boxe-toulouse-boxing-center-site-logo.webp"
logo_dest = os.path.join(dest_dir, "logo.png")
try:
    print(f"Downloading official logo from {logo_url}...")
    urllib.request.urlretrieve(logo_url, logo_dest)
    print("Logo downloaded successfully!")
except Exception as e:
    print(f"Error downloading logo: {e}")

# 2. Download hero section background image
bg_url = "https://boxingcenter.fr/wp-content/uploads/2024/03/entrainement-mma-plannings-club-boxe-toulouse.webp"
bg_dest = os.path.join(dest_dir, "header-bg.png")
try:
    print(f"Downloading header bg from {bg_url}...")
    urllib.request.urlretrieve(bg_url, bg_dest)
    print("Header bg downloaded successfully!")
except Exception as e:
    print(f"Error downloading header bg: {e}")
