import json

with open('catalog/products_list_433.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

for i in range(108):
    print(f"{i+1:3d}. {products[i]['name']}")
