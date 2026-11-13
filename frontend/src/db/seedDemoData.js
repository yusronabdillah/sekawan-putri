import { db } from './db';
import { apiClient } from '../services/apiClient';
import { v4 as uuidv4 } from 'uuid';

export const KOPI_SORE_PRODUCTS = [
  {
    id: 'prod-ks-001',
    sku: 'KS-SID-1000',
    barcode: '899700100001',
    name: 'Kopi Robusta Sidikalang (Biji / Bubuk) 1 Kg',
    category: 'Robusta Nusantara',
    price: 115000,
    cost_price: 85000,
    stock: 50,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80',
    description: 'Robusta Sidikalang pilihan khas Sumatera Utara dengan body tebal, aroma kuat, dan dark chocolate notes.',
    discount: 0
  },
  {
    id: 'prod-ks-002',
    sku: 'KS-LNN-0500',
    barcode: '899700100002',
    name: 'Kopi Robusta Lanang / Peaberry 500g',
    category: 'Robusta Nusantara',
    price: 85000,
    cost_price: 60000,
    stock: 35,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    description: 'Biji kopi tunggal (peaberry) bulat pilihan dengan kafein ganda dan aroma harum semerbak.',
    discount: 0
  },
  {
    id: 'prod-ks-003',
    sku: 'KS-MDN-1000',
    barcode: '899700100003',
    name: 'Kopi Robusta Medan Super (Biji / Bubuk) 1 Kg',
    category: 'Robusta Nusantara',
    price: 110000,
    cost_price: 80000,
    stock: 40,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=500&auto=format&fit=crop&q=80',
    description: 'Robusta murni favorit racikan kopitiam dan kedai kopi Medan klasik.',
    discount: 0
  },
  {
    id: 'prod-ks-004',
    sku: 'KS-STD-1000',
    barcode: '899700100004',
    name: 'Kopi Bubuk Standar Warkop 1 Kg (Best Seller)',
    category: 'Kopi Grosir & Warkop',
    price: 78000,
    cost_price: 58000,
    stock: 120,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop&q=80',
    description: 'Kopi bubuk racikan standar langganan ribuan warkop dan pedagang kopi keliling sejak 1980.',
    discount: 0
  },
  {
    id: 'prod-ks-005',
    sku: 'KS-ARB-0250',
    barcode: '899700100005',
    name: 'Arabika Nusantara Special Blend 250g',
    category: 'Arabika & Specialty',
    price: 65000,
    cost_price: 45000,
    stock: 28,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80',
    description: 'Perpaduan Arabika Gayo & Mandheling dengan aroma floral dan aftertaste manis karamel.',
    discount: 0
  },
  {
    id: 'prod-ks-006',
    sku: 'KS-DMP-1000',
    barcode: '899700100006',
    name: 'Kopi Robusta Dampit Malang 1 Kg',
    category: 'Robusta Nusantara',
    price: 120000,
    cost_price: 88000,
    stock: 30,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&auto=format&fit=crop&q=80',
    description: 'Robusta lereng Gunung Semeru Dampit dengan aroma nutty, manis alami, dan keasaman sangat rendah.',
    discount: 0
  },
  {
    id: 'prod-ks-007',
    sku: 'KS-PKT-0005',
    barcode: '899700100007',
    name: 'Paket Hemat Grosir Warkop 5 Kg (5x 1 Kg)',
    category: 'Kopi Grosir & Warkop',
    price: 365000,
    cost_price: 280000,
    stock: 15,
    unit: 'Paket',
    image_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=500&auto=format&fit=crop&q=80',
    description: 'Paket hemat bundel 5 bungkus @1 Kg bubuk kopi standar warkop, margin lebih untung.',
    discount: 0
  },
  {
    id: 'prod-ks-008',
    sku: 'KS-GLA-1000',
    barcode: '899700100008',
    name: 'Gula Aren Cair Organik Premium 1 Liter',
    category: 'Bahan Baku & Sirup',
    price: 45000,
    cost_price: 32000,
    stock: 50,
    unit: 'Botol',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
    description: 'Gula aren nira asli kental tanpa bahan pengawet, pelengkap signature Es Kopi Susu Aren.',
    discount: 0
  },
  {
    id: 'prod-ks-009',
    sku: 'KS-KRM-0488',
    barcode: '899700100009',
    name: 'Krimer Kental Manis Carnation 488g',
    category: 'Bahan Baku & Sirup',
    price: 16500,
    cost_price: 13500,
    stock: 80,
    unit: 'Kaleng',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    description: 'Susu kental manis gurih kental untuk racikan kopi tarik dan kopi susu.',
    discount: 0
  },
  {
    id: 'prod-ks-010',
    sku: 'KS-CUP-0050',
    barcode: '899700100010',
    name: 'Hot Paper Cup 8oz + Lid Tutup (Isi 50 pcs)',
    category: 'Packaging & Cup',
    price: 35000,
    cost_price: 25000,
    stock: 60,
    unit: 'Pack',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80',
    description: 'Cup kertas tahan panas tebal lengkap dengan tutup lid untuk sajian kopi panas take-away.',
    discount: 0
  }
];

export async function seedDemoKopiSore() {
  const isDemo = import.meta.env.VITE_IS_DEMO === 'true' || Boolean(import.meta.env.VITE_COLLECTION_PREFIX);
  if (!isDemo) return;

  try {
    const existingCount = await db.products.count();
    if (existingCount === 0) {
      console.log('[DEMO SEED] Inisialisasi produk demo Kopi Sore 67...');
      await db.products.bulkAdd(KOPI_SORE_PRODUCTS);

      // Sinkronisasi ke Firestore demo collection jika online
      if (window.navigator.onLine) {
        for (const prod of KOPI_SORE_PRODUCTS) {
          try {
            await apiClient.syncOperation({
              entity: 'products',
              action: 'CREATE',
              payload: prod
            });
          } catch (e) {
            console.warn('[DEMO SEED] Gagal sync produk ke cloud:', prod.name, e);
          }
        }
      }
      console.log(`[DEMO SEED] Berhasil memasukkan ${KOPI_SORE_PRODUCTS.length} produk Kopi Sore.`);
    }
  } catch (err) {
    console.error('[DEMO SEED ERROR]', err);
  }
}
