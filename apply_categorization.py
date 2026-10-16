import json
import csv

def categorize(p):
    name = p['name']
    n = name.lower()
    sheet = p.get('sheet_source', '')
    no = p.get('sheet_no', 0)

    # 1. Buah: Nanas, Jeruk Lemon, Jeruk Nipis, Jeruk Sambel, Tomat
    if any(k in n for k in ['nanas', 'jeruk lemon', 'jeruk nipis', 'jeruk sambel', 'tomat']) and not any(k in n for k in ['saos tomat', 'delmonte tomat', 'sarden abc tomat', 'sarden asahi tomat', 'aice nanas']):
        return 'Buah'

    # 2. Ice Cream: Aice, Es Tube
    if n.startswith('aice') or 'es tube' in n:
        return 'Ice Cream'

    # 3. Kebutuhan Rumah: Gas, Rokok, Korek, Sabun/Detergen, Sunlight, Wipol, Daia, Attack, Lifebuoy, Giv, Tusuk Sate, Arang, Sumpit
    if any(k in n for k in ['gas lpg', 'gas portable', 'rokok', 'korek api', 'sunlight', 'wipol', 'daia', 'attack', 'lifebuoy', 'giv body wash', 'tusuk sate', 'arang', 'sumpit']):
        return 'Kebutuhan Rumah'

    # 4. Minuman: Kopi, Teh, The, Susu, Club, Cleo, Milku, Golda, Bearbrand, You C 1000, Kratindaeng, Sprite, Coca Cola, Power F, Extrajoss, Nipis Madu, Pucuk, Larutan
    if any(k in n for k in ['kopi', 'coffee', 'teh ', 'the gelas', 'the pucuk', 'club ', 'cleo ', 'milku', 'golda', 'bearbrand', 'you c 1000', 'kratindaeng', 'sprite', 'coca cola', 'power f', 'extrajoss', 'nipis madu', 'larutan']):
        return 'Minuman'

    # 5. Telur & Mie / Sembako priority before bumbu (e.g. Indomie Ayam Bawang contains 'bawang' but is Mie)
    if 'telur' in n or any(k in n for k in ['indomie', 'mie ', 'mie sedap', 'mie sedaap', 'bihun', 'soun', 'ekomie']):
        return 'Sembako'

    # 6. Frozen Food (from Sheet2 items 83-172, or Goreng Bakso no 39)
    if sheet == 'Sheet2' and (83 <= no <= 172 or no == 39):
        return 'Frozen Food'
    if any(k in n for k in ['nugget', 'sosis', 'siomay', 'dimsum', 'kulit dimsum', 'kulit lumpia', 'cedea', 'cireng', 'odeng', 'dumpling', 'kebab', 'maryam', 'minipao', 'beef slice', 'daging sapi giling']):
        return 'Frozen Food'

    # 7. Bumbu Dapur:
    bumbu_keywords = [
        'cabe', 'bawang', 'bombay', 'jahe', 'kunyit', 'laos', 'sereh', 'daun jeruk', 'daun salam', 'kemiri', 'biji pala', 'cengkeh',
        'biji lada', 'biji ketumbar', 'jinten', 'kapulaga', 'asem jawa', 'pokak', 'masako', 'royco', 'racik', 'sasa bumbu',
        'kobe ayam', 'kobe opor', 'kobe soto', 'kobe nasi', 'kobe bumbu', 'desaku', 'bamboe', 'bumbu basah', 'bumbu lengkap',
        'bumbu hidayah', 'sajiku capcay', 'sajiku sop', 'sajiku ayam', 'sajiku nasi', 'mamasuka', 'magic lezat', 'kaldu jamur',
        'kecap', 'saori', 'minyak wijen', 'saos', 'delmonte', 'mamayo', 'mayonais', 'mc lewis', 'gourmet', 'chilli oil',
        'ultra bumbu tabur', 'cuka'
    ]
    if any(k in n for k in bumbu_keywords):
        return 'Bumbu Dapur'

    # 8. Sembako:
    sembako_keywords = [
        'beras', 'minyak fraiswell', 'minyak kita', 'minyak rizki', 'minyak sunco', 'minyak gelas', 'minyak botol',
        'gula pasir', 'gula merah', 'garam', 'mentega', 'santan', 'terigu', 'tepung', 'baking powder', 'soda kue',
        'soun', 'ekomie', 'mie ', 'indomie', 'bihun', 'sarden', 'indomilk skm', 'nutricake', 'kacang goreng'
    ]
    if any(k in n for k in sembako_keywords):
        return 'Sembako'

    # 9. Sayur:
    return 'Sayur'

def main():
    json_path = 'catalog/products_list_433.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        products = json.load(f)

    category_counts = {}
    for p in products:
        new_cat = categorize(p)
        p['category'] = new_cat
        category_counts[new_cat] = category_counts.get(new_cat, 0) + 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print("=== HASIL KATEGORISASI 433 PRODUK ===")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f" - {cat}: {count} produk")
    print(f"Total: {sum(category_counts.values())} produk")

    # Update CSV as well
    csv_path = 'PL sementara frozen food nafa.csv'
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', 'SKU', 'Name', 'Category', 'Price', 'Stock', 'Unit', 'Sheet', 'SheetNo'])
        for p in products:
            writer.writerow([
                p['id'],
                p['sku'],
                p['name'],
                p['category'],
                p['price'],
                p.get('stock', 20),
                p.get('unit', 'Pcs'),
                p.get('sheet_source', ''),
                p.get('sheet_no', '')
            ])
    print(f"Updated {json_path} and {csv_path} successfully!")

if __name__ == '__main__':
    main()
