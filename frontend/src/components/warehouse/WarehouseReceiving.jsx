import React, { useState } from 'react';
import { db } from '../../db/db';
import { useAuthStore } from '../../store/store';
import { Save, PackageOpen, Box, Tag, Calendar, PenTool, RefreshCw } from 'lucide-react';
import { AppCard, AppCombobox, AppInput, AppDatePicker, AppTextarea, AppButton } from '../ui';
import CustomSelect from '../CustomSelect';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { notificationService } from '../../services/notificationService';
import { syncService } from '../../services/syncService';
import { AppMonthPicker } from '../ui/AppMonthPicker';

export default function WarehouseReceiving({ onSave }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  const productsData = useLiveQuery(() => db.products.toArray(), []);
  const batchesData = useLiveQuery(() => db.batches.toArray(), []);
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quickAddForm, setQuickAddForm] = useState({ name: '', price: '', cost_price: '', category: 'Frozen Food' });

  const [formData, setFormData] = useState({
    productId: '',
    qty: '',
    costPrice: '',
    batchNumber: '',
    inDate: new Date().toISOString().split('T')[0],
    expDate: '',
    notes: ''
  });

  const products = productsData || [];
  const batches = batchesData || [];

  if (productsData === undefined || batchesData === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
          <div>Memuat form penerimaan...</div>
        </div>
      </div>
    );
  }

  const handleBarcodeScan = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;
      
      const found = products.find(p => p.barcode === code);
      if (found) {
         setFormData({...formData, productId: found.id, costPrice: found.cost_price || ''});
         setBarcodeInput('');
      } else {
         const newProduct = {
           id: uuidv4(),
           name: code,
           barcode: code,
           category: 'Lainnya',
           price: 0,
           cost_price: 0,
           stock: 0,
           image_url: ''
         };
         await db.products.add(newProduct);
         await syncService.addToQueue('products', 'CREATE', newProduct);
         
         setFormData({...formData, productId: newProduct.id, costPrice: 0});
         setBarcodeInput('');
         alert(`Produk baru "${code}" berhasil dibuat otomatis! Lanjutkan mengisi jumlah.`);
      }
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const newProduct = {
      id: uuidv4(),
      name: quickAddForm.name,
      barcode: scannedBarcode,
      category: quickAddForm.category,
      price: Number(quickAddForm.price),
      cost_price: Number(quickAddForm.cost_price),
      stock: 0,
      image_url: ''
    };
    await db.products.add(newProduct);
    await syncService.addToQueue('products', 'CREATE', newProduct);
    setIsQuickAddOpen(false);
    setFormData({...formData, productId: newProduct.id, costPrice: newProduct.cost_price});
    alert('Produk Master berhasil dibuat! Lanjutkan mengisi jumlah stok masuk.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productId || !formData.qty || !formData.batchNumber) {
      alert("Harap isi semua field wajib (Produk, Qty, No. Batch)");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        product_id: formData.productId,
        qty: parseInt(formData.qty),
        cost_price: parseFloat(formData.costPrice || 0),
        batch_number: formData.batchNumber,
        in_date: formData.inDate,
        exp_date: formData.expDate || null,
        notes: formData.notes
      };

      const approvalId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newApproval = {
        id: approvalId,
        type: 'RECEIVE_GOODS',
        reference_id: approvalId,
        status: 'Pending',
        requested_by: user.id,
        approved_by: null,
        request_payload: JSON.stringify(payload),
        created_at: new Date().toISOString()
      };

      await db.approvals.add(newApproval);
      await syncService.addToQueue('approvals', 'CREATE', newApproval);

      const prod = products.find(p => p.id === formData.productId);
      
      const auditLog = {
        id: `al-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        action: 'RECEIVE_GOODS',
        user_id: user.id,
        user_name: user.name || user.username,
        user_role: user.role,
        product_id: formData.productId,
        product_name: prod?.name,
        details: `Mencatat penerimaan ${formData.qty} pcs produk ke Batch ${formData.batchNumber}`,
        created_at: new Date().toISOString()
      };
      
      await db.audit_logs.add(auditLog);
      await syncService.addToQueue('audit_logs', 'CREATE', auditLog);

      await notificationService.notifyOwner({
        title: 'Approval Barang Masuk',
        message: `Permintaan penerimaan ${formData.qty}x ${prod?.name || 'Produk'} menunggu persetujuan.`,
        type: 'APPROVAL_REQUEST',
        reference_id: approvalId
      });

      alert('Barang Masuk berhasil dicatat dan menunggu Approval Owner.');
      setFormData({
        productId: '',
        qty: '',
        costPrice: '',
        batchNumber: '',
        inDate: new Date().toISOString().split('T')[0],
        expDate: '',
        notes: ''
      });
      
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  if (products.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto', backgroundColor: 'var(--background)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: 'var(--primary)' }}>
          <PackageOpen size={40} />
        </div>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '24px' }}>Belum Ada Data Produk</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px', lineHeight: '1.6' }}>Silakan tambahkan produk master terlebih dahulu melalui menu Inventory sebelum memasukkan barang ke gudang.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <AppCard style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px' }}>Penerimaan Barang Masuk</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Catat penambahan stok baru ke dalam sistem gudang.
        </p>
      
        <form onSubmit={handleSubmit}>
          
          {/* Section 1: Informasi Produk */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Box size={20} color="var(--primary)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Informasi Produk</h3>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <AppInput 
                label={<span>Scan Barcode <span style={{fontSize:'12px', color:'var(--text-muted)'}}>(Tekan Enter)</span></span>}
                type="text" 
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan atau ketik barcode lalu tekan Enter..."
              />
            </div>

            {formData.productId ? (
              <div className="animate-fade-in" style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                  <PackageOpen size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', marginBottom: '2px', textTransform: 'uppercase' }}>Produk Terdeteksi</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {products.find(p => p.id === formData.productId)?.name || 'Produk Baru (Akan didaftarkan)'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '12px', textAlign: 'center', color: 'var(--warning)', fontSize: '14px', backgroundColor: 'var(--warning-light)', border: '1px dashed var(--warning)', borderRadius: '12px', fontWeight: '500' }}>
                Silakan scan barcode terlebih dahulu.
              </div>
            )}
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          {/* Section 2: Informasi Batch & Pembelian */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Tag size={20} color="var(--primary)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Informasi Batch & Pembelian</h3>
            </div>
            
            <div className="grid-2" style={{ gap: '20px' }}>
              <AppInput 
                label={<span>Nomor Batch <span style={{color: 'var(--danger)'}}>*</span></span>}
                type="text" 
                value={formData.batchNumber}
                onChange={e => setFormData({...formData, batchNumber: e.target.value})}
                placeholder="Contoh: BATCH-001"
                required
              />
              <AppInput 
                label={<span>Jumlah (Qty) <span style={{color: 'var(--danger)'}}>*</span></span>}
                type="number" 
                value={formData.qty}
                onChange={e => setFormData({...formData, qty: e.target.value})}
                min="1"
                placeholder="0"
                required
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <AppInput 
                  label="Harga Modal / Harga Beli (Opsional)"
                  type="number" 
                  value={formData.costPrice}
                  onChange={e => setFormData({...formData, costPrice: e.target.value})}
                  min="0"
                  placeholder="0"
                  icon={<span style={{ fontWeight: 'bold' }}>Rp</span>}
                />
              </div>
            </div>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          {/* Section 3: Informasi Kadaluarsa & Catatan */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Calendar size={20} color="var(--primary)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Waktu & Keterangan Tambahan</h3>
            </div>
            
            <div className="grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
              <AppDatePicker 
                label="Tanggal Masuk"
                value={formData.inDate}
                onChange={val => setFormData({...formData, inDate: val})}
              />
              <AppMonthPicker 
                label="Tgl. Kadaluarsa (Expired)"
                value={formData.expDate}
                onChange={val => setFormData({...formData, expDate: val})}
                placeholder="Pilih Expired Date"
              />
            </div>

            <AppTextarea 
              label={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PenTool size={16} /> Catatan</span>}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              rows="3"
              placeholder="Tulis keterangan atau informasi tambahan..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <AppButton type="button" variant="outline" onClick={() => onSave && onSave()} style={{ backgroundColor: 'var(--surface)' }}>
              Batal
            </AppButton>
            <AppButton type="submit" loading={loading} icon={<Save size={18} />}>
              Ajukan Barang Masuk
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* QUICK ADD MODAL */}
      {isQuickAddOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--surface)', padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Daftar Produk Baru</h3>
            <form onSubmit={handleQuickAdd}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Barcode</label>
                <input type="text" className="form-input" value={scannedBarcode} readOnly style={{ backgroundColor: 'var(--background)' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Nama Produk</label>
                <input type="text" className="form-input" required value={quickAddForm.name} onChange={e => setQuickAddForm({...quickAddForm, name: e.target.value})} autoFocus />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Kategori</label>
                <CustomSelect 
                  value={quickAddForm.category}
                  onChange={val => setQuickAddForm({...quickAddForm, category: val})}
                  options={[
                    { value: 'Frozen Food', label: 'Frozen Food' },
                    { value: 'Sayur', label: 'Sayur' },
                    { value: 'Minuman', label: 'Minuman' },
                    { value: 'Sembako', label: 'Sembako' }
                  ]}
                  placeholder="Pilih Kategori"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Harga Modal</label>
                <input type="number" className="form-input" required value={quickAddForm.cost_price} onChange={e => setQuickAddForm({...quickAddForm, cost_price: e.target.value})} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Harga Jual</label>
                <input type="number" className="form-input" required value={quickAddForm.price} onChange={e => setQuickAddForm({...quickAddForm, price: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsQuickAddOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
