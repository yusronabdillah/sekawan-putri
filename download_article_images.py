import os
import io
import requests
from PIL import Image
from ddgs import DDGS

os.makedirs('catalog/public/articles', exist_ok=True)

def process_article_banner(image_bytes, target_path, w_target=800, h_target=480):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    w, h = img.size
    scale = max(w_target / w, h_target / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    cx = (new_w - w_target) // 2
    cy = (new_h - h_target) // 2
    img = img.crop((cx, cy, cx + w_target, cy + h_target))
    img.save(target_path, 'WEBP', quality=88)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

article_searches = [
    ('article-1.webp', 'freezer food storage containers refrigerator kitchen'),
    ('article-2.webp', 'kids bento lunch box nugget sausage rice'),
    ('article-3.webp', 'fresh vegetables spices shallot chili market kitchen')
]

with DDGS() as ddgs:
    for filename, query in article_searches:
        print(f"Searching for {filename} with query '{query}'...")
        results = list(ddgs.images(query, max_results=3))
        for r in results:
            url = r.get('image', '')
            try:
                resp = requests.get(url, headers=headers, timeout=6)
                if resp.status_code == 200 and len(resp.content) > 10000:
                    out = os.path.join('catalog/public/articles', filename)
                    process_article_banner(resp.content, out)
                    print(f" -> SUCCESS saved {out} ({len(resp.content)//1024} KB)")
                    break
            except Exception as e:
                print(f" -> Failed: {e}")

print("Done downloading article images!")
