# Sekawan Putri - POS, Inventory & Public E-Commerce Catalog

Sistem manajemen kasir (POS), inventaris gudang, dan katalog belanja online untuk **Sekawan Putri (Frozen Food & Sayur Segar)**. Dibangun dengan arsitektur modular yang memisahkan aplikasi kasir internal, katalog publik untuk pelanggan, serta backend API & sinkronisasi cloud real-time.

🌐 **Website Katalog Live:** [sekawanputri.com](https://sekawanputri.com)  

---

## 📌 Ringkasan Arsitektur Proyek

Repository ini terdiri dari 3 modul utama:

```
├── backend/    # REST API & Database Service (Node.js, Express, SQLite)
├── frontend/   # Dashboard Admin, Kasir POS & Manajemen Stok Gudang (React, Vite, PWA)
└── catalog/    # Website Toko & Katalog Publik Pelanggan (React, Vite, Tailwind/CSS)
```

---

## 🚀 Fitur Utama

### 1. POS & Admin Dashboard (`frontend`)
- **Point of Sale (POS) Kasir:** Transaksi cepat dengan dukungan barcode/SKU, diskon, pajak, dan cetak struk (Thermal & PDF).
- **Manajemen Inventaris & Stok:** Tracking stok real-time, satuan dinamis (Pack, Pcs, Kg, Gram), dan riwayat pergerakan stok.
- **Dukungan Offline-First (PWA):** Tetap dapat memproses transaksi saat jaringan terputus menggunakan IndexedDB (Dexie) dan antrean sinkronisasi otomatis (*sync queue*).
- **Integrasi Cloud Real-Time:** Sinkronisasi multi-device otomatis menggunakan Google Cloud Firestore.
- **Notifikasi Transaksi:** Integrasi notifikasi bot Telegram untuk pemantauan penjualan langsung.
- **Laporan Penjualan:** Ekspor laporan harian, bulanan, serta rekapitulasi kas ke format Excel & PDF.

### 2. Website Katalog Publik (`catalog`)
- **Tampilan Responsif:** Optimal untuk smartphone dan desktop.
- **Katalog Real-Time:** Menampilkan daftar produk dan ketersediaan stok yang selalu sinkron dengan sistem POS.
- **Pemesanan WhatsApp Instan:** Pelanggan dapat memilih produk dan diarahkan langsung ke checkout pesan WhatsApp terformat otomatis.
- **Informasi Toko & Lokasi:** Profil toko, alamat terintegrasi Google Maps, dan jam operasional.
- **Deployment Teroptimasi:** Terhubung langsung ke domain utama `sekawanputri.com` via Vercel Edge Network.

### 3. Backend Service (`backend`)
- REST API berbasis Express.js.
- Local persistent storage menggunakan SQLite.
- Endpoint sinkronisasi data transaksi, produk, dan audit logging.

---

## 🛠️ Tech Stack

- **Frontend & Catalog:** React 19, Vite, Lucide Icons, Dexie.js (IndexedDB PWA).
- **Backend:** Node.js, Express.js, SQLite3.
- **Database Cloud:** Firebase Firestore (Realtime Sync & Rules).
- **Hosting & CI/CD:** Vercel (Production Frontend & Catalog).
- **Notifikasi:** Telegram Bot API.

---

## 💻 Panduan Menjalankan di Lokal (Development)

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+)
- npm atau yarn

### 1. Clone Repository
```bash
git clone https://github.com/yusronabdillah/sekawan-putri.git
cd sekawan-putri
```

### 2. Jalankan Backend
```bash
cd backend
npm install
npm run dev
```
> Server berjalan di `http://localhost:5000`

### 3. Jalankan Aplikasi POS (Frontend)
```bash
cd ../frontend
npm install
npm run dev
```
> POS Dashboard berjalan di `http://localhost:5173`

### 4. Jalankan Website Katalog
```bash
cd ../catalog
npm install
npm run dev
```
> Website Katalog berjalan di `http://localhost:5174`

---

## 📦 Deployment

- **Catalog:** Dideploy ke Vercel dengan konfigurasi custom domain `sekawanputri.com` dan fallback SPA di `vercel.json`.
- **Frontend POS:** Dapat dideploy ke Vercel / Netlify atau dijalankan secara lokal di PC kasir toko.

---

## 📄 Lisensi
Hak cipta dilindungi undang-undang © Sekawan Putri.
