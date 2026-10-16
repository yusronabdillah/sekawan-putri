import os
import io
import json
import time
import sys
import requests
from PIL import Image
from ddgs import DDGS

sys.stdout.reconfigure(encoding='utf-8')

# Ensure target directories exist
CATALOG_DIR = 'catalog/public/products'
FRONTEND_DIR = 'frontend/public/products'
os.makedirs(CATALOG_DIR, exist_ok=True)
os.makedirs(FRONTEND_DIR, exist_ok=True)

def process_and_save_image(image_bytes, target_path, size=500):
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert RGBA to RGB with white background
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    else:
        img = img.convert('RGB')
        
    w, h = img.size
    max_dim = max(w, h)
    
    # Scale down if larger than target size
    if max_dim > size:
        scale = size / max_dim
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        w, h = new_w, new_h
        
    # Place on square canvas of size (size x size)
    canvas = Image.new('RGB', (size, size), (255, 255, 255))
    offset = ((size - w) // 2, (size - h) // 2)
    canvas.paste(img, offset)
    
    # Save as WebP
    canvas.save(target_path, 'WEBP', quality=82)

def build_search_query(name, category):
    n = name.lower()
    
    # Brand-specific or specific item queries
    if n.startswith('rokok') or n.startswith('gas') or 'sunlight' in n or 'wipol' in n or 'daia' in n or 'attack' in n or 'lifebuoy' in n or 'giv' in n:
        return name
    if 'aice' in n or 'es tube' in n:
        return f"{name} es krim"
    if 'cedea' in n or 'nugget' in n or 'sosis' in n or 'bakso' in n or 'siomay' in n or 'dimsum' in n or 'cireng' in n or 'kebab' in n or 'maryam' in n or 'minipao' in n or 'beef slice' in n:
        return f"{name} frozen food"
    if 'bamboe' in n or 'desaku' in n or 'racik' in n or 'masako' in n or 'royco' in n or 'sajiku' in n or 'mamasuka' in n or 'kobe' in n or 'saori' in n or 'delmonte' in n or 'kecap' in n or 'saos' in n:
        return f"{name} bumbu"
    if 'indomie' in n or 'mie ' in n or 'sedaap' in n or 'bihun' in n or 'soun' in n or 'terigu' in n or 'tepung' in n or 'minyak' in n or 'gula' in n or 'sarden' in n:
        return f"{name} kemasan"
    if 'bearbrand' in n or 'golda' in n or 'milku' in n or 'cleo' in n or 'club' in n or 'pucuk' in n or 'kopi' in n or 'teh' in n or 'sprite' in n or 'coca' in n or 'extrajoss' in n or 'kratindaeng' in n or 'larutan' in n:
        return f"{name} minuman"
    
    # Category based defaults
    if category == 'Buah':
        return f"{name} buah segar"
    elif category == 'Sayur':
        if 'tempe' in n:
            return "tempe segar mentah"
        if 'tahu' in n:
            return "tahu putih mentah"
        if 'ikan' in n:
            return f"{name} basah"
        return f"{name} sayur segar"
    elif category == 'Bumbu Dapur':
        return f"{name} bumbu segar"
    elif category == 'Sembako':
        if 'telur' in n:
            return f"{name} butir"
        return f"{name} produk"
    
    return f"{name} produk"

def main():
    json_path = 'catalog/products_list_433.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        products = json.load(f)
        
    print(f"=== MEMULAI PENGUNDUHAN OTOMATIS FOTO {len(products)} PRODUK ===")
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'}
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    with DDGS() as ddgs:
        for idx, p in enumerate(products, 1):
            sku = p['sku']
            name = p['name']
            cat = p['category']
            
            target_catalog = os.path.join(CATALOG_DIR, f"{sku}.webp")
            target_frontend = os.path.join(FRONTEND_DIR, f"{sku}.webp")
            
            # Check if both files already exist and are valid (>1KB)
            if os.path.exists(target_catalog) and os.path.getsize(target_catalog) > 1000 and \
               os.path.exists(target_frontend) and os.path.getsize(target_frontend) > 1000:
                p['image_url'] = f"/products/{sku}.webp"
                skip_count += 1
                if idx % 20 == 0:
                    print(f"[{idx}/{len(products)}] {sku} - {name} (Sudah ada, dilewati)")
                continue
                
            query = build_search_query(name, cat)
            print(f"[{idx}/{len(products)}] Mengunduh: {sku} - {name} (Query: '{query}')...")
            
            downloaded = False
            try:
                results = list(ddgs.images(query, max_results=3))
                if not results:
                    # Fallback query with just the name
                    results = list(ddgs.images(name, max_results=2))
                    
                for r in results:
                    img_url = r.get('image')
                    if not img_url:
                        continue
                    try:
                        resp = requests.get(img_url, headers=headers, timeout=8)
                        if resp.status_code == 200 and len(resp.content) > 1000:
                            process_and_save_image(resp.content, target_catalog)
                            process_and_save_image(resp.content, target_frontend)
                            p['image_url'] = f"/products/{sku}.webp"
                            size_kb = os.path.getsize(target_catalog) / 1024
                            print(f"   -> BERHASIL disimpan ({size_kb:.1f} KB)")
                            downloaded = True
                            success_count += 1
                            break
                    except Exception:
                        continue
                        
                if not downloaded:
                    print(f"   -> GAGAL menemukan gambar yang bisa diunduh untuk {name}")
                    fail_count += 1
                    
            except Exception as e:
                print(f"   -> ERROR saat mencari {name}: {e}")
                fail_count += 1
                
            time.sleep(0.35) # Smooth delay to avoid rate limiting
            
            # Save progress to JSON every 25 items
            if idx % 25 == 0:
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(products, f, indent=2, ensure_ascii=False)
                print(f"   [CHECKPOINT] Progress disimpan ke {json_path}")
                
    # Final save
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
        
    print(f"\n=== SELESAI ===")
    print(f"Total Produk: {len(products)}")
    print(f"Berhasil diunduh: {success_count}")
    print(f"Sudah ada sebelumnya: {skip_count}")
    print(f"Gagal/Belum ketemu: {fail_count}")

if __name__ == '__main__':
    main()
