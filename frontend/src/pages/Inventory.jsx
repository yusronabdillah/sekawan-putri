import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import CurrencyInput from '../components/CurrencyInput';
import { Plus, Edit2, PackagePlus, FileUp, Upload, X, Search, Image as ImageIcon, Package, Trash2, RefreshCw } from 'lucide-react';
import { AppDatePicker, AppMonthPicker, PageHeader } from '../components/ui';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { useCategoryStore, useAuthStore } from '../store/store';

export default function Inventory() {
  const liveProducts = useLiveQuery(() => db.products.toArray(), null);
  const isLoading = liveProducts === null;
  const products = React.useMemo(() => {
    if (!liveProducts) return [];
    return [...liveProducts]
      .filter(p => p.name && String(p.name).trim() !== '' && String(p.name) !== 'undefined')
      .sort((a, b) => (a.sku || a.id || '').localeCompare(b.sku || b.id || ''));
  }, [liveProducts]);
  const [search, setSearch] = useState('');
  const [parentCategory, setParentCategory] = useState('Semua');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const { categories, parentMapping = {} } = useCategoryStore();
  const { user } = useAuthStore();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', name: '', barcode: '', category: 'Frozen Food', price: '', cost_price: '', stock: '', image_url: '', discount: '' 
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const filteredProducts = React.useMemo(() => {
    let result = products;
    
    if (parentCategory !== 'Semua') {
      const allowedCats = categories.filter(c => (parentMapping[c] || 'Kategori A') === parentCategory);
      result = result.filter(p => allowedCats.includes(p.category));
    }

    if (filterCategory !== 'Semua') {
      result = result.filter(p => p.category === filterCategory);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        (p.barcode && p.barcode.toLowerCase().includes(lower)) ||
        p.category.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [search, filterCategory, parentCategory, products, categories, parentMapping]);

  const loadProducts = async () => {
    const allLocal = await db.products.toArray();
    const zombies = allLocal.filter(p => !p.name || String(p.name).trim() === '' || String(p.name) === 'undefined');
    if (zombies.length > 0) {
      await db.products.bulkDelete(zombies.map(z => z.id));
    }
  };

  const handleHardReset = async () => {
    if (window.confirm('PERINGATAN TAHAP 1: Anda akan menghapus SELURUH data produk secara permanen dari perangkat ini. Lanjutkan?')) {
      const confirmation = window.prompt('KONFIRMASI TAHAP 2: Ketik "HAPUS" (huruf besar semua) untuk mengeksekusi penghapusan permanen:');
      if (confirmation === 'HAPUS') {
        await db.products.clear();
        await db.sync_queue.clear();
        alert('Database lokal berhasil dibersihkan! Layar akan dimuat ulang.');
        window.location.reload();
      } else {
        alert('Penghapusan dibatalkan karena teks konfirmasi tidak sesuai.');
      }
    }
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ id: '', name: '', barcode: '', category: 'Frozen Food', price: '', cost_price: '0', stock: '', image_url: '', unit: 'Pcs', exp_date: '', discount: '' });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p) => {
    setIsEditMode(true);
    setFormData({ ...p });
    setIsAddOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        canvas.width = 400;
        canvas.height = 400;
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({...prev, image_url: base64}));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const productData = {
      id: isEditMode ? formData.id : uuidv4(),
      name: formData.name,
      barcode: formData.barcode,
      sku: formData.barcode, 
      category: formData.category,
      price: Number(formData.price),
      cost_price: Number(formData.cost_price),
      stock: Number(formData.stock),
      image_url: formData.image_url,
      unit: formData.unit || 'Pcs',
      exp_date: formData.exp_date || '',
      discount: Number(formData.discount) || 0
    };

    if (isEditMode) {
      await db.products.put(productData);
    } else {
      await db.products.add(productData);
    }
    
    await db.sync_queue.add({
      id: uuidv4(),
      entity: 'products',
      action: isEditMode ? 'UPDATE' : 'CREATE',
      payload: productData,
      status: 'PENDING',
      created_at: new Date().toISOString()
    });

    setIsAddOpen(false);
    loadProducts();
  };

  const handleCSVSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setImportPreview({
          total: results.data.length,
          data: results.data
        });
      }
    });
  };

  const executeImport = async () => {
    if (!importPreview || !importPreview.data) return;
    
    const rows = importPreview.data;
    setImportProgress({ total: rows.length, current: 0, status: 'Memproses data...' });
    
    let current = 0;
    const batchSize = 100;
    
    try {
      const existingProducts = await db.products.toArray();
      const skuMap = new Map(existingProducts.map(p => [p.sku, p]));
      
      for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const updates = [];
          const inserts = [];
          
          for (const row of batch) {
              const barcode = (row['Barcode'] || row['SKU'])?.trim();
              if (!barcode) continue; 
              
              const productData = {
                  sku: barcode,
                  name: row['Nama Produk'] || 'Produk Tanpa Nama',
                  category: row['Kategori'] || 'Frozen Food',
                  price: Number(String(row['Harga Jual']).replace(/[^0-9]/g, '')) || 0,
                  cost_price: Number(String(row['Harga Modal'] || '0').replace(/[^0-9]/g, '')) || 0,
                  stock: Number(row['Stok Awal']) || 0,
                  unit: row['Unit'] || row['Satuan'] || 'Pcs',
                  barcode: barcode,
                  image_url: skuMap.has(barcode) ? skuMap.get(barcode).image_url : ''
              };
              
              const existing = skuMap.get(barcode);
              if (existing) {
                  updates.push({ ...existing, ...productData, id: existing.id });
              } else {
                  inserts.push({ id: uuidv4(), ...productData });
              }
          }
          
          if (inserts.length > 0) {
            await db.products.bulkAdd(inserts);
            for (const p of inserts) {
               await db.sync_queue.add({
                 id: uuidv4(),
                 entity: 'products',
                 action: 'CREATE',
                 payload: p,
                 status: 'PENDING',
                 created_at: new Date().toISOString()
               });
            }
          }
          if (updates.length > 0) {
            await db.products.bulkPut(updates);
            for (const p of updates) {
               await db.sync_queue.add({
                 id: uuidv4(),
                 entity: 'products',
                 action: 'UPDATE',
                 payload: p,
                 status: 'PENDING',
                 created_at: new Date().toISOString()
               });
            }
          }
          
          current += batch.length;
          setImportProgress({ total: rows.length, current, status: `Menyimpan ${current} dari ${rows.length}...` });
      }
      
      setImportProgress({ total: rows.length, current: rows.length, status: `Import berhasil. ${rows.length} Produk diimport.` });
      loadProducts();
      
      setTimeout(() => {
          closeImport();
      }, 1500);

    } catch (error) {
      console.error("Import error:", error);
      setImportProgress({ total: rows.length, current, status: `Gagal: Terjadi kesalahan saat menyimpan.` });
      
      setTimeout(() => {
          closeImport();
      }, 2000);
    }
  };

  const closeImport = () => {
    setIsImportOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportProgress(null);
  };

  return (
    <div className="page-transition">
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--background)', margin: '-16px -16px 16px -16px', padding: '16px 16px 0 16px' }}>
        <PageHeader 
          title="Manajemen Stok"
          subtitle={`Total ${products.length} Produk`}
          icon={Package}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)} style={{ flex: '1 1 auto', minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileUp size={20} style={{ marginRight: '8px' }} /> Import CSV
              </button>
              <button className="btn btn-primary" onClick={handleOpenAdd} style={{ flex: '1 1 auto', minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} style={{ marginRight: '8px' }} /> Tambah Produk
              </button>
            </>
          }
        />

        {/* Parent Categories */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
          {['Semua', 'Kategori A', 'Kategori B'].map(cat => (
            <button 
              key={cat}
              style={{ 
                padding: '6px 16px', 
                cursor: 'pointer', 
                border: '1px solid var(--border)',
                backgroundColor: parentCategory === cat ? 'var(--primary)' : 'var(--surface)',
                color: parentCategory === cat ? 'white' : 'var(--text-main)',
                fontSize: '14px',
                fontWeight: parentCategory === cat ? '600' : '500',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                setParentCategory(cat);
                setFilterCategory('Semua');
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub Categories */}
        {parentCategory !== 'Semua' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button 
              style={{ 
                padding: '4px 12px', 
                cursor: 'pointer', 
                border: '1px solid var(--border)',
                backgroundColor: filterCategory === 'Semua' ? 'var(--secondary)' : 'var(--background)',
                color: filterCategory === 'Semua' ? 'white' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: filterCategory === 'Semua' ? '600' : '500',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setFilterCategory('Semua')}
            >
              Semua {parentCategory}
            </button>
            {categories.filter(cat => (parentMapping[cat] || 'Kategori A') === parentCategory).map(cat => (
              <button 
                key={cat}
                style={{ 
                  padding: '4px 12px', 
                  cursor: 'pointer', 
                  border: '1px solid var(--border)',
                  backgroundColor: filterCategory === cat ? 'var(--secondary)' : 'var(--background)',
                  color: filterCategory === cat ? 'white' : 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: filterCategory === cat ? '600' : '500',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {parentCategory === 'Semua' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button 
              style={{ 
                padding: '4px 12px', 
                cursor: 'pointer', 
                border: '1px solid var(--border)',
                backgroundColor: filterCategory === 'Semua' ? 'var(--secondary)' : 'var(--background)',
                color: filterCategory === 'Semua' ? 'white' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: filterCategory === 'Semua' ? '600' : '500',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setFilterCategory('Semua')}
            >
              Semua Kategori
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                style={{ 
                  padding: '4px 12px', 
                  cursor: 'pointer', 
                  border: '1px solid var(--border)',
                  backgroundColor: filterCategory === cat ? 'var(--secondary)' : 'var(--background)',
                  color: filterCategory === cat ? 'white' : 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: filterCategory === cat ? '600' : '500',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="search-bar" style={{ marginBottom: '16px' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Cari nama atau barcode..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <X size={20} color="var(--text-muted)" onClick={() => setSearch('')} style={{cursor:'pointer'}}/>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
            <div>Memuat data produk...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Belum ada produk atau pencarian tidak ditemukan.
          </div>
        ) : (
          filteredProducts.map(p => (
          <div key={p.id} className="card flex justify-between items-center" style={{ padding: '16px', margin: 0 }}>
            <div className="flex items-center gap-3">
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--background)', flexShrink: 0 }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b' }}>
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{p.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span>Barcode: {p.barcode || '-'} • Kategori: {p.category || '-'} • Stok: {p.stock} {p.unit || 'Pcs'}</span>
                  {p.stock <= 0 ? (
                    <span className="badge badge-danger" style={{ padding: '2px 8px', fontSize: '10px', boxShadow: 'var(--shadow-sm)' }}>
                      Habis
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ fontWeight: '700', color: 'var(--primary)', textAlign: 'right' }}>
                {p.price > 0 ? `Rp ${p.price.toLocaleString('id-ID')}` : <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Input Manual (Rp 0)</span>}
              </div>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => handleOpenEdit(p)}>
                <Edit2 size={16} />
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px', color: 'var(--text-muted)' }} 
                onClick={async () => {
                  if (window.confirm(`PERINGATAN TAHAP 1: Hapus permanen produk ${p.name}?`)) {
                    const confirmation = window.prompt(`KONFIRMASI TAHAP 2: Ketik "HAPUS" untuk menghapus permanen produk ${p.name}:`);
                    if (confirmation === 'HAPUS') {
                      await db.products.delete(p.id);
                      await db.sync_queue.add({
                        id: uuidv4(),
                        entity: 'products',
                        action: 'DELETE',
                        payload: { id: p.id },
                        status: 'PENDING',
                        created_at: new Date().toISOString()
                      });
                      alert('Produk berhasil dihapus permanen.');
                      loadProducts();
                    } else {
                      alert('Penghapusan dibatalkan.');
                    }
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )))}
        {filteredProducts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Menampilkan seluruh <strong>{filteredProducts.length}</strong> produk (Total Master: {products.length} produk).
          </div>
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={isEditMode ? "Edit Produk" : "Tambah Produk"} maxWidth="720px">
        <form onSubmit={handleSaveProduct} style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="product-form-layout">
            <div className="product-form-image">
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', backgroundColor: 'var(--background)', boxSizing: 'border-box' }}>
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={36} />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              <button type="button" className="btn btn-secondary btn-block" style={{ fontSize: '13px', padding: '6px' }} onClick={() => imageInputRef.current?.click()}>
                Upload Foto
              </button>
            </div>
            
            <div className="product-form-fields">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Produk</label>
                <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori</label>
                <CustomSelect 
                  value={formData.category} 
                  onChange={val => setFormData({...formData, category: val})}
                  options={categories.map(c => ({ value: c, label: c }))}
                />
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Barcode</label>
              <input type="text" className="form-input" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Scan atau ketik manual..." />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Harga Modal</label>
              <CurrencyInput required value={formData.cost_price} onChange={val => setFormData({...formData, cost_price: val})} />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label className="form-label">Harga Jual (Rp)</label>
            <CurrencyInput required value={formData.price} onChange={val => setFormData({...formData, price: val})} />
          </div>

          {user?.role === 'OWNER' && (
            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Diskon Manual (%)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.discount} 
                onChange={e => setFormData({...formData, discount: e.target.value})} 
                placeholder="Contoh: 10 untuk diskon 10%" 
                min="0"
                max="100"
              />
              <span className="text-muted" style={{ fontSize: '12px' }}>*Hanya Owner yang bisa mengatur diskon produk ini (Otomatis mengubah harga di kasir)</span>
            </div>
          )}
          
          <div className="grid-2" style={{ gap: '16px', marginTop: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Stok Awal</label>
              <input type="number" className="form-input" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Satuan</label>
              <CustomSelect 
                value={formData.unit || 'Pcs'} 
                onChange={val => setFormData({...formData, unit: val})}
                options={[
                  { value: 'Pcs', label: 'Pcs' },
                  { value: 'Kg', label: 'Kg' }
                ]}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <AppMonthPicker 
              label="Tanggal Kadaluarsa (Opsional)"
              value={formData.exp_date}
              onChange={val => setFormData({...formData, exp_date: val})}
              placeholder="Bulan & Tahun (Opsional)"
            />
          </div>
          
          <div style={{ position: 'sticky', bottom: '-20px', backgroundColor: 'var(--surface)', margin: '24px -20px -20px -20px', padding: '16px 20px 20px 20px', borderTop: '1px solid var(--border)', zIndex: 10 }}>
            <button type="submit" className="btn btn-primary btn-block">Simpan Produk</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isImportOpen} onClose={closeImport} title="Import Master Produk">
        {!importFile && (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--border)', borderRadius: '12px' }}>
            <Upload size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '8px' }}>Pilih File CSV</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Pastikan CSV memiliki kolom: Barcode, Nama Produk, Kategori, Harga Jual, Stok Awal
            </p>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleCSVSelect} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              Browse File
            </button>
          </div>
        )}

        {importPreview && !importProgress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ backgroundColor: 'var(--background)', margin: 0 }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Pratinjau Data</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Ditemukan <strong>{importPreview.total}</strong> produk siap diimport.
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 4px' }}>Barcode</th>
                      <th style={{ padding: '8px 4px' }}>Nama Produk</th>
                      <th style={{ padding: '8px 4px' }}>Kategori</th>
                      <th style={{ padding: '8px 4px' }}>Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.data.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px 4px' }}>{row['Barcode']}</td>
                        <td style={{ padding: '8px 4px' }}>{row['Nama Produk']}</td>
                        <td style={{ padding: '8px 4px' }}>{row['Kategori']}</td>
                        <td style={{ padding: '8px 4px' }}>{row['Harga Jual']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.total > 5 && (
                  <div style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>...dan {importPreview.total - 5} lainnya</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-block" onClick={() => {setImportFile(null); setImportPreview(null);}}>Batal</button>
              <button className="btn btn-primary btn-block" onClick={executeImport}>Mulai Import</button>
            </div>
          </div>
        )}

        {importProgress && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ marginBottom: '16px', fontWeight: '600' }}>{importProgress.status}</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--background)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                width: `${(importProgress.current / importProgress.total) * 100}%`,
                transition: 'width 0.3s'
              }}></div>
            </div>
            {importProgress.current === importProgress.total && (
              <button className="btn btn-primary btn-block" style={{ marginTop: '24px' }} onClick={closeImport}>Tutup</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
