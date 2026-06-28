import urllib.request
from PIL import Image
import os

url = "https://boxingcenter.fr/wp-content/uploads/2025/08/planning-boxing-center-barrierre-de-paris-minimes-2025-2026.webp"
dest = r"c:\Users\Mommy Jayce\Desktop\Boxing Center\Plannings\bc-plannings\public\header-bg.png"

# Download the webp flyer
temp_path = "temp_flyer.webp"
try:
    print(f"Downloading flyer from {url}...")
    urllib.request.urlretrieve(url, temp_path)
    
    # Open and crop the top 220 pixels
    with Image.open(temp_path) as img:
        width, height = img.size
        # The top banner is from y=0 to y=220
        cropped = img.crop((0, 0, width, 220))
        # Save as PNG
        cropped.save(dest, "PNG")
        print(f"Cropped banner successfully saved to {dest}!")
        
    # Clean up temp file
    if os.path.exists(temp_path):
        os.remove(temp_path)
except Exception as e:
    print(f"Error: {e}")
