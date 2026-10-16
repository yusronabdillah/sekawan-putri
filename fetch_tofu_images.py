import os
import io
import sys
import requests
from PIL import Image
from ddgs import DDGS

sys.stdout.reconfigure(encoding='utf-8')

tofu_items = [
    {
        'sku': 'SKW00002',
        'name': 'Tahu',
        'queries': [
            'tahu putih potong segar white background',
            'tahu putih mentah segar',
            'fresh white tofu isolated white background'
        ]
    },
    {
        'sku': 'SKW00003',
        'name': 'Tahu Bumbu Kotak',
        'queries': [
            'tahu kuning mika bumbu',
            'tahu takwa kediri kotak',
            'tahu kuning kotak kemasan'
        ]
    },
    {
        'sku': 'SKW00004',
        'name': 'Tahu Bumbu Plastik',
        'queries': [
            'tahu kuning bungkus plastik',
            'tahu bumbu kuning plastik',
            'tahu pong plastik pasar'
        ]
    }
]

def zoom_to_fill(image_bytes, target_cat, target_front, size=500):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    w, h = img.size
    
    # Auto-trim white borders if present
    gray = img.convert('L')
    bw = gray.point(lambda x: 255 if x < 240 else 0, '1')
    bbox = bw.getbbox()
    if bbox:
        bw_w = bbox[2] - bbox[0]
        bw_h = bbox[3] - bbox[1]
        if bw_w > w * 0.3 and bw_h > h * 0.3:
            pad = int(min(bw_w, bw_h) * 0.04)
            x0 = max(0, bbox[0] - pad)
            y0 = max(0, bbox[1] - pad)
            x1 = min(w, bbox[2] + pad)
            y1 = min(h, bbox[3] + pad)
            img = img.crop((x0, y0, x1, y1))
            w, h = img.size
            
    scale = max(size / w, size / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    cx = (new_w - size) // 2
    cy = (new_h - size) // 2
    img = img.crop((cx, cy, cx + size, cy + size))
    img.save(target_cat, 'WEBP', quality=85)
    img.save(target_front, 'WEBP', quality=85)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

with DDGS() as ddgs:
    for item in tofu_items:
        sku = item['sku']
        name = item['name']
        print(f"\n--- Searching for {sku} - {name} ---")
        
        saved = False
        for q in item['queries']:
            try:
                results = list(ddgs.images(q, max_results=3))
                for r in results:
                    url = r.get('image', '')
                    title = (r.get('title') or '').lower()
                    if any(bad in title for bad in ['crn', 'oye', 'shopee promo', 'banner']):
                        continue
                    try:
                        resp = requests.get(url, headers=headers, timeout=5)
                        if resp.status_code == 200 and len(resp.content) > 2000:
                            cat_p = f"catalog/public/products/{sku}.webp"
                            front_p = f"frontend/public/products/{sku}.webp"
                            zoom_to_fill(resp.content, cat_p, front_p)
                            print(f" -> SUCCESS: {q} | {title[:40]} ({len(resp.content)//1024} KB)")
                            saved = True
                            break
                    except Exception:
                        pass
                if saved:
                    break
            except Exception as e:
                print(f"Error {q}: {e}")
                
print("\nDone updating the 3 tofu types!")
