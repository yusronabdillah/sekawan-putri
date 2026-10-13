import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useAuthStore } from '../../store/store';
import { Send, ListChecks, CheckCircle, Search, X, RefreshCw } from 'lucide-react';
import { AppCard, AppCombobox, AppInput, AppTextarea, AppButton, AppEmptyState, AppBadge } from '../ui';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from '../../services/notificationService';
import { syncService } from '../../services/syncService';

export default function WarehouseRestock() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [requests, setRequests] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [search, setSearch] = useState('');
  
  // Point 2: Multiple products selection
  // selectedProducts = { [productId]: { qty: '', reason: '' } }
  const [selectedProducts, setSelectedProducts] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const allProds = await db.products.toArray();
      const allReqs = await db.restock_requests.toArray();
      
      const pMap = {};
      allProds.forEach(p => pMap[p.id] = p);
      
      setProductsMap(pMap);
      setProducts(allProds);
      
      // Sort by newest
      allReqs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRequests(allReqs);
    } catch (err) {
      console.error(err);
    }
    setIsLoadingData(false);
  };

  const handleToggleProduct = (productId) => {
    setSelectedProducts(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = { qty: '', reason: '' };
      }
      return next;
    });
  };

  const handleUpdateProduct = (productId, field, value) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const productIds = Object.keys(selectedProducts);
    if (productIds.length === 0) {
      alert("Harap pilih minimal satu produk untuk di-restock.");
      return;
    }

    // Validation
    for (const pid of productIds) {
      if (!selectedProducts[pid].qty || parseInt(selectedProducts[pid].qty) <= 0) {
        alert("Kuantitas (Qty) untuk setiap produk terpilih harus diisi lebih dari 0.");
        return;
      }
    }

    try {
      setLoading(true);
      
      for (const pid of productIds) {
        const item = selectedProducts[pid];
        const reqId = `restock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const newRequest = {
          id: reqId,
          product_id: pid,
          qty: parseInt(item.qty),
          reason: item.reason,
          priority: 'Normal',
          status: 'Pending Approval',
          created_by: user.id,
          approved_by: null,
          created_at: new Date().toISOString()
        };

        await db.restock_requests.add(newRequest);
        await syncService.addToQueue('restock_requests', 'CREATE', newRequest);

        const prod = productsMap[pid];
        
        const auditLog = {
          id: `al-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          action: 'CREATE_RESTOCK',
          user_id: user.id,
          user_name: user.name || user.username,
          user_role: user.role,
          product_id: pid,
          product_name: prod?.name,
          details: `Mengajukan permintaan restock sebanyak ${item.qty} pcs`,
          created_at: new Date().toISOString()
        };
        
        await db.audit_logs.add(auditLog);
        await syncService.addToQueue('audit_logs', 'CREATE', auditLog);
      }

      await notificationService.notifyOwner({
        title: 'Permintaan Restock Baru (Kolektif)',
        message: `${user.name || 'Gudang'} mengajukan restock untuk ${productIds.length} macam produk.`,
        type: 'RESTOCK_REQUEST',
        reference_id: 'bulk-' + Date.now()
      });

      setTimeout(() => { syncService.processQueue(); }, 100);

      alert(`Berhasil mengajukan restock untuk ${productIds.length} produk.`);
      setSelectedProducts({});
      loadData();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Tinggi') return 'var(--danger)';
    if (priority === 'Normal') return 'var(--primary)';
    return 'var(--text-muted)';
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoadingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
          <div>Memuat data restock...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Form Request */}
      <AppCard style={{ maxHeight: '800px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px' }}>Buat Permintaan Restock</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Pilih satu atau beberapa produk di bawah ini untuk diajukan restock secara kolektif.
        </p>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '40px' }}
            placeholder="Cari produk..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 2, borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '12px 8px', width: '40px', textAlign: 'center' }}>Pilih</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Produk</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Kategori</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Stok</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Produk tidak ditemukan</td>
                </tr>
              ) : filteredProducts.map(p => {
                const isSelected = !!selectedProducts[p.id];
                return (
                  <React.Fragment key={p.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent', cursor: 'pointer' }} onClick={() => handleToggleProduct(p.id)}>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleProduct(p.id)} style={{ width: '16px', height: '16px' }} />
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '500' }}>{p.name}</td>
                      <td style={{ padding: '12px 8px' }}>{p.category}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span className={p.stock <= 10 ? 'badge badge-danger' : ''} style={p.stock <= 10 ? { padding: '4px 8px' } : {}}>
                          {p.stock} {p.unit || ''}
                        </span>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr style={{ backgroundColor: 'var(--primary-light)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan="4" style={{ padding: '0 16px 16px 16px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 120px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Qty Restock <span style={{color:'var(--danger)'}}>*</span></label>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ padding: '6px 12px' }} 
                                value={selectedProducts[p.id].qty} 
                                onChange={e => handleUpdateProduct(p.id, 'qty', e.target.value)} 
                                placeholder="Qty" 
                                required
                              />
                            </div>
                            <div style={{ flex: '2 1 200px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Catatan (Opsional)</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '6px 12px' }} 
                                value={selectedProducts[p.id].reason} 
                                onChange={e => handleUpdateProduct(p.id, 'reason', e.target.value)} 
                                placeholder="Contoh: Barang cepat habis minggu ini" 
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <AppButton type="submit" loading={loading} icon={<Send size={18} />}>
              Ajukan {Object.keys(selectedProducts).length > 0 ? `(${Object.keys(selectedProducts).length})` : ''}
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* List Request */}
      <AppCard style={{ maxHeight: '800px', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px' }}>Riwayat Permintaan</h2>
        
        {requests.length === 0 ? (
          <AppEmptyState 
            icon={<ListChecks size={48} />}
            title="Belum ada permintaan"
            description="Permintaan restock barang yang diajukan akan muncul di sini."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map(req => {
              const product = productsMap[req.product_id];
              const dateObj = new Date(req.created_at);
              const dateStr = !isNaN(dateObj) ? dateObj.toLocaleString() : 'Tanggal Tidak Valid';
              return (
                <div key={req.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{product?.name || req.product_name || 'Produk Dihapus'}</div>
                    <AppBadge variant={req.status === 'Approved' ? 'success' : req.status === 'Pending Approval' ? 'warning' : 'danger'}>
                      {req.status}
                    </AppBadge>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Qty: </span>
                      <strong>{req.qty || 0} {product?.unit || 'Pcs'}</strong>
                    </div>
                  </div>
                  
                  {req.reason && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', backgroundColor: 'var(--background)', padding: '8px', borderRadius: '6px' }}>
                      {req.reason}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Diajukan: {dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppCard>
    </div>
  );
}
