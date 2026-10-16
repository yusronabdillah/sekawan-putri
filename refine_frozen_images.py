import os
import io
import sys
import time
import requests
from PIL import Image
from ddgs import DDGS

sys.stdout.reconfigure(encoding='utf-8')

def zoom_to_fill_square(image_bytes, target_path, size=500):
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    else:
        img = img.convert('RGB')
        
    w, h = img.size
    
    # Check if there is white letterboxing/pillarboxing in the source image itself
    # If source has large white borders, we can auto-trim white borders before zoom!
    bg_color = (255, 255, 255)
    # Get bounding box of non-white pixels (threshold < 245)
    gray = img.convert('L')
    # find pixels darker than 245
    bw = gray.point(lambda x: 255 if x < 245 else 0, '1')
    bbox = bw.getbbox()
    if bbox:
        bw_width = bbox[2] - bbox[0]
        bw_height = bbox[3] - bbox[1]
        # If the non-white content is at least 40% of the image, crop to the content with a small 5% margin
        if bw_width > w * 0.4 and bw_height > h * 0.4:
            margin = int(min(bw_width, bw_height) * 0.05)
            x0 = max(0, bbox[0] - margin)
            y0 = max(0, bbox[1] - margin)
            x1 = min(w, bbox[2] + margin)
            y1 = min(h, bbox[3] + margin)
            img = img.crop((x0, y0, x1, y1))
            w, h = img.size

    # Zoom to fill square (Cover mode)
    scale = max(size / w, size / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    crop_x = (new_w - size) // 2
    crop_y = (new_h - size) // 2
    img = img.crop((crop_x, crop_y, crop_x + size, crop_y + size))
    img.save(target_path, 'WEBP', quality=85)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

sample_items = [
    ('SKW00349', 'Cedea Crabstick 250gr'),
    ('SKW00400', 'Nugget Kanzler Crispy 450gr'),
    ('SKW00423', 'Sosis Champ 1kg'),
    ('SKW00409', 'Sosis So Nice Bakar isi 10'),
    ('SKW00336', 'Bakso Salam Sachet'),
    ('SKW00379', 'Minipao Coklat'),
    ('SKW00376', 'Donat MC Original'),
    ('SKW00350', 'Cireng Salju Bintang'),
    ('SKW00381', 'Kentang Max 1kg'),
    ('SKW00364', 'Daging Sapi Giling 250gr')
]

os.makedirs('test_refined_ff', exist_ok=True)

with DDGS() as ddgs:
    for sku, name in sample_items:
        print(f"\n[Processing] {sku} - {name}...")
        
        # Priority 1: Tokopedia (images.tokopedia.net) which has clean product photos
        # Priority 2: Packshot / white background with negative filter for reseller frames
        queries = [
            f"{name} site:tokopedia.com",
            f"{name} packshot white background -crn -oye -shopee -banner -reseller",
            f"{name} kemasan produk -crn -oye -reseller -promo"
        ]
        
        saved = False
        for q in queries:
            try:
                results = list(ddgs.images(q, max_results=5))
                for r in results:
                    title = (r.get('title') or '').lower()
                    url = r.get('image') or ''
                    
                    # Avoid seller branding / promo frames
                    bad_words = ['crn', 'oye', 'reseller', 'promo', 'diskon', 'grosir', 'banner', 'frame']
                    if any(b in title for b in bad_words):
                        continue
                    if any(b in url.lower() for b in bad_words):
                        continue
                        
                    try:
                        resp = requests.get(url, headers=headers, timeout=6)
                        if resp.status_code == 200 and len(resp.content) > 3000:
                            target = f"test_refined_ff/{sku}.webp"
                            zoom_to_fill_square(resp.content, target)
                            size_kb = os.path.getsize(target) / 1024
                            print(f" -> BERHASIL ({size_kb:.1f} KB): {url[:60]}... | {title[:35]}")
                            saved = True
                            break
                    except Exception:
                        continue
                if saved:
                    break
            except Exception as e:
                print(f" -> Error {q}: {e}")
        time.sleep(0.3)

print("\nRefined test complete!")
