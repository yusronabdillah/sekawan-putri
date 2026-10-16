import os
import io
import sys
import json
import time
import requests
import numpy as np
from PIL import Image
from ddgs import DDGS

sys.stdout.reconfigure(encoding='utf-8')

CATALOG_DIR = 'catalog/public/products'
FRONTEND_DIR = 'frontend/public/products'
os.makedirs(CATALOG_DIR, exist_ok=True)
os.makedirs(FRONTEND_DIR, exist_ok=True)

def zoom_to_fill_square(image_bytes, size=500):
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    else:
        img = img.convert('RGB')
        
    w, h = img.size
    if w < 200 or h < 200:
        return None, -100
        
    np_img = np.array(img)
    
    # Check for solid promo banners in bottom 15% (e.g. Oye Mart / Shopee promo frames)
    bottom_strip = np_img[int(h * 0.85):, :]
    bottom_mean = bottom_strip.mean(axis=(0, 1))
    r, g, b = bottom_mean
    max_c, min_c = max(r, g, b), min(r, g, b)
    sat = (max_c - min_c) / (max_c + 1e-5)
    
    # Reject images with strong saturated bottom promo bars
    if sat > 0.42 and max_c < 225:
        return None, -50
        
    # Check border whiteness for minimalist packshot score
    top_edge = np_img[:int(h * 0.05), :]
    left_edge = np_img[:, :int(w * 0.05)]
    right_edge = np_img[:, int(w * 0.95):]
    border_pixels = np.concatenate([top_edge.reshape(-1, 3), left_edge.reshape(-1, 3), right_edge.reshape(-1, 3)])
    white_ratio = np.mean(border_pixels > 230)
    score = white_ratio * 100
    
    # Auto-trim white margins to ensure product zooms and fills the box
    gray = img.convert('L')
    bw = gray.point(lambda x: 255 if x < 240 else 0, '1')
    bbox = bw.getbbox()
    if bbox:
        bw_w = bbox[2] - bbox[0]
        bw_h = bbox[3] - bbox[1]
        if bw_w > w * 0.25 and bw_h > h * 0.25:
            pad_x = int(bw_w * 0.03)
            pad_y = int(bw_h * 0.03)
            x0 = max(0, bbox[0] - pad_x)
            y0 = max(0, bbox[1] - pad_y)
            x1 = min(w, bbox[2] + pad_x)
            y1 = min(h, bbox[3] + pad_y)
            img = img.crop((x0, y0, x1, y1))
            w, h = img.size
            
    # Zoom to fill (Cover mode: fills 100% of the square)
    scale = max(size / w, size / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    cx = (new_w - size) // 2
    cy = (new_h - size) // 2
    img = img.crop((cx, cy, cx + size, cy + size))
    
    return img, score

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def main():
    with open('catalog/products_list_433.json', 'r', encoding='utf-8') as f:
        products = json.load(f)
        
    frozen_products = [p for p in products if p.get('category') == 'Frozen Food']
    print(f"=== MEMULAI REVISI FOTO UNTUK {len(frozen_products)} PRODUK FROZEN FOOD ===")
    print("Kriteria: Zoom penuh memenuhi kotak (cover), tanpa watermark/logo toko lain, background minimalis.\n")
    
    updated_count = 0
    
    with DDGS() as ddgs:
        for idx, p in enumerate(frozen_products, 1):
            sku = p['sku']
            name = p['name']
            
            print(f"[{idx}/{len(frozen_products)}] Memproses {sku} - {name}...")
            
            # Prioritized queries designed to fetch clean packshots without reseller logos
            queries = [
                f'{name} site:blibli.com',
                f'{name} "official store"',
                f'{name} packshot white background -crn -oye -banner -reseller',
                f'{name} site:tokopedia.com',
                f'{name} kemasan produk frozen food'
            ]
            
            best_img = None
            best_score = -999
            best_url = ""
            
            for q in queries:
                try:
                    results = list(ddgs.images(q, max_results=4))
                    for r in results:
                        url = r.get('image', '')
                        title = (r.get('title') or '').lower()
                        
                        # Filter out reseller names, promo frames, and watermarks
                        bad_words = ['crn', 'oye', 'reseller', 'promo', 'diskon', 'grosir', 'banner', 'frame', 'voucher']
                        if any(b in title for b in bad_words) or any(b in url.lower() for b in bad_words):
                            continue
                            
                        try:
                            resp = requests.get(url, headers=headers, timeout=5)
                            if resp.status_code == 200:
                                processed, score = zoom_to_fill_square(resp.content)
                                if processed and score > best_score:
                                    best_score = score
                                    best_img = processed
                                    best_url = url
                                    if score > 75: # High confidence clean packshot
                                        break
                        except Exception:
                            pass
                    if best_score > 75:
                        break
                except Exception as e:
                    pass
                time.sleep(0.2)
                
            if best_img:
                target_cat = os.path.join(CATALOG_DIR, f"{sku}.webp")
                target_front = os.path.join(FRONTEND_DIR, f"{sku}.webp")
                best_img.save(target_cat, 'WEBP', quality=85)
                best_img.save(target_front, 'WEBP', quality=85)
                size_kb = os.path.getsize(target_cat) / 1024
                print(f"   -> BERHASIL disimpan ({size_kb:.1f} KB, Score: {best_score:.1f})")
                updated_count += 1
            else:
                print(f"   -> Tetap menggunakan gambar sebelumnya (tidak ada pengganti lebih bersih)")
                
            time.sleep(0.25)
            
    print(f"\n=== SELESAI REVISI FROZEN FOOD ===")
    print(f"Total produk frozen food direvisi: {updated_count} / {len(frozen_products)}")

if __name__ == '__main__':
    main()
