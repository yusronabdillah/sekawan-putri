import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/db';
import { Clock, AlertTriangle, CheckCircle, Package, Search, Filter, ChevronLeft, ChevronRight, Inbox, PlusCircle, RefreshCw, Trash2, Edit2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppCard, AppInput, AppButton, AppEmptyState, AppBadge } from '../ui';
import Modal from '../../components/Modal';

export default function BatchManagement({ onNavigateToReceiving }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Action states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [newQty, setNewQty] = useState('');

  const rawBatchesData = useLiveQuery(() => db.batches.toArray(), []);
  const productsData = useLiveQuery(() => db.products.toArray(), []);
  
  const rawBatches = rawBatchesData?.filter(b => b.qty > 0) || [];
  const products = productsData || [];

  const productsMap = useMemo(() => {
    const pMap = {};
    products.forEach(p => pMap[p.id] = p);
    return pMap;
  }, [products]);

  const getStatusInfo = (expDate) => {
    if (!expDate) return { id: 'SAFE', text: 'Aman', color: 'var(--success)', bgColor: 'var(--success-light)', icon: CheckCircle };
    
    const now = new Date();
    const exp = new Date(expDate);
    const diffTime = exp - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { id: 'EXPIRED', text: 'Expired', color: 'var(--danger)', bgColor: 'var(--danger-light)', icon: AlertTriangle };
    if (diffDays <= 7) return { id: 'CRITICAL', text: '< 7 Hari', color: 'var(--danger)', bgColor: 'var(--danger-light)', icon: AlertTriangle };
    if (diffDays <= 30) return { id: 'WARNING', text: '< 30 Hari', color: 'var(--warning)', bgColor: 'var(--warning-light)', icon: Clock };
    
    return { id: 'SAFE', text: 'Aman', color: 'var(--success)', bgColor: 'var(--success-light)', icon: CheckCircle };
  };

  // Attach status and sort
  const processedBatches = useMemo(() => {
    const enriched = rawBatches.map(b => {
      const product = productsMap[b.product_id] || {};
      const status = getStatusInfo(b.exp_date);
      return { ...b, product, status };
    });

    enriched.sort((a, b) => {
      if (!a.exp_date) return 1;
      if (!b.exp_date) return -1;
      return new Date(a.exp_date) - new Date(b.exp_date);
    });

    return enriched;
  }, [rawBatches, productsMap]);

  // Derived metrics
  const totalBatches = processedBatches.length;
  const expiredCount = processedBatches.filter(b => b.status.id === 'EXPIRED').length;
  const criticalCount = processedBatches.filter(b => b.status.id === 'CRITICAL').length;
  const warningCount = processedBatches.filter(b => b.status.id === 'WARNING').length;

  // Filter & Search
  const filteredBatches = useMemo(() => {
    return processedBatches.filter(b => {
      const matchesSearch = 
        (b.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.product?.barcode || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || b.status.id === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [processedBatches, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage) || 1;
  const paginatedBatches = filteredBatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleDispose = async (batch) => {
    if (window.confirm(`Yakin ingin membuang/menghapus sisa stok batch ${batch.batch_number} sejumlah ${batch.qty} ${batch.product?.unit || 'pcs'}?\n(Ini akan mengurangi stok utama produk)`)) {
      try {
        await db.transaction('rw', db.batches, db.products, async () => {
          const product = await db.products.get(batch.product_id);
          if (product) {
            await db.products.update(product.id, { stock: Math.max(0, product.stock - batch.qty) });
          }
          await db.batches.update(batch.id, { qty: 0 });
        });
      } catch (e) {
        console.error('Failed to dispose batch', e);
      }
    }
  };

  const handleEditSave = async () => {
    if (!editingBatch || newQty === '') return;
    const qtyNum = Number(newQty);
    if (qtyNum < 0) return;
    
    try {
      await db.transaction('rw', db.batches, db.products, async () => {
        const diff = qtyNum - editingBatch.qty;
        const product = await db.products.get(editingBatch.product_id);
        if (product) {
          await db.products.update(product.id, { stock: Math.max(0, product.stock + diff) });
        }
        await db.batches.update(editingBatch.id, { qty: qtyNum });
      });
      setIsEditModalOpen(false);
    } catch(e) {
      console.error('Failed to update batch qty', e);
    }
  };

  if (rawBatchesData === undefined || productsData === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
          <div>Memuat data batch...</div>
        </div>
      </div>
    );
  }

  if (rawBatches.length === 0 && searchQuery === '' && statusFilter === 'ALL') {
    return (
      <AppEmptyState 
        icon={<Inbox size={40} color="var(--primary)" />}
        title="Belum ada Batch Aktif"
        description="Gudang Anda saat ini kosong. Silakan catat penerimaan barang masuk terlebih dahulu untuk mulai membuat batch dan memantau expired."
      />
    );
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Dashboard Batch & Expired</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Pantau ketersediaan batch produk dan status kadaluarsa secara realtime.</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <AppCard style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Total Batch Aktif</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>{totalBatches}</div>
          </div>
        </AppCard>

        <AppCard style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Hampir Expired (&lt;30 Hr)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>{warningCount}</div>
          </div>
        </AppCard>

        <AppCard style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: criticalCount > 0 ? '1px solid var(--danger)' : 'none' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>Sangat Kritis (&lt;7 Hr)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>{criticalCount}</div>
          </div>
        </AppCard>

        <AppCard style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Telah Expired</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>{expiredCount}</div>
          </div>
        </AppCard>
      </div>

      {/* Main DataTable Area */}
      <AppCard style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '300px', flex: 1, margin: 0 }}>
            <AppInput 
              type="text" 
              placeholder="Cari produk, barcode, atau batch..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['ALL', 'SAFE', 'WARNING', 'CRITICAL', 'EXPIRED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === filter ? 'var(--primary)' : 'var(--background)',
                    color: statusFilter === filter ? '#fff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {filter === 'ALL' ? 'Semua Status' : filter === 'SAFE' ? 'Aman' : filter === 'WARNING' ? '< 30 Hari' : filter === 'CRITICAL' ? '< 7 Hari' : 'Expired'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Table (Hidden on small screens) */}
        <div className="table-responsive hidden-mobile">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ padding: '16px 20px' }}>Produk</th>
                <th>Nomor Batch</th>
                <th>Sisa Kuantitas</th>
                <th>Tgl. Masuk</th>
                <th>Expired</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    Tidak ada batch yang cocok dengan pencarian atau filter Anda.
                  </td>
                </tr>
              ) : (
                paginatedBatches.map(batch => {
                  const StatusIcon = batch.status.icon;
                  return (
                    <tr key={batch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>{batch.product?.name || 'Produk Tidak Ditemukan'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Barcode: {batch.product?.barcode || '-'}</div>
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{batch.batch_number}</td>
                      <td>
                        <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-main)' }}>{batch.qty}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '6px' }}>{batch.product?.unit || 'Pcs'}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{batch.in_date ? new Date(batch.in_date).toLocaleDateString() : '-'}</td>
                      <td style={{ fontWeight: batch.exp_date ? '600' : 'normal', color: 'var(--text-main)', fontSize: '14px' }}>
                        {batch.exp_date ? new Date(batch.exp_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Tidak Ada'}
                      </td>
                      <td>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          backgroundColor: batch.status.bgColor, 
                          color: batch.status.color,
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          <StatusIcon size={14} />
                          {batch.status.text}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-icon"
                            style={{ width: '32px', height: '32px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: '8px' }}
                            title="Edit / Sesuaikan Stok"
                            onClick={() => {
                              setEditingBatch(batch);
                              setNewQty(batch.qty.toString());
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-icon"
                            style={{ width: '32px', height: '32px', color: 'var(--danger)', backgroundColor: 'var(--danger-light)', borderRadius: '8px' }}
                            title="Buang / Dispose Batch"
                            onClick={() => handleDispose(batch)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View (Visible only on small screens) */}
        <div className="mobile-only-list" style={{ display: 'none' }}>
          {paginatedBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              Tidak ada batch yang cocok dengan pencarian atau filter.
            </div>
          ) : (
            paginatedBatches.map(batch => {
              const StatusIcon = batch.status.icon;
              return (
                <div key={batch.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px', marginBottom: '2px' }}>{batch.product?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{batch.product?.barcode || '-'} • {batch.batch_number}</div>
                    </div>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      backgroundColor: batch.status.bgColor, 
                      color: batch.status.color,
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      <StatusIcon size={12} />
                      {batch.status.text}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Sisa Stok</div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{batch.qty} <span style={{fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)'}}>{batch.product?.unit || 'Pcs'}</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Expired Date</div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{batch.exp_date ? new Date(batch.exp_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                      onClick={() => {
                        setEditingBatch(batch);
                        setNewQty(batch.qty.toString());
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit2 size={14} style={{ marginRight: '6px' }} /> Edit
                    </button>
                    <button 
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '8px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                      onClick={() => handleDispose(batch)}
                    >
                      <Trash2 size={14} style={{ marginRight: '6px' }} /> Buang
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Halaman <strong style={{ color: 'var(--text-main)' }}>{currentPage}</strong> dari {totalPages}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <AppButton 
                variant="outline" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0 12px', minHeight: '36px' }}
              >
                <ChevronLeft size={18} />
              </AppButton>
              <AppButton 
                variant="outline" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0 12px', minHeight: '36px' }}
              >
                <ChevronRight size={18} />
              </AppButton>
            </div>
          </div>
        )}
      </AppCard>
      {/* Edit Qty Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Sesuaikan Kuantitas Batch">
        {editingBatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Produk</div>
              <div style={{ fontWeight: '600' }}>{editingBatch.product?.name} ({editingBatch.batch_number})</div>
            </div>
            
            <div>
              <label className="form-label">Kuantitas Aktual (Sisa Asli di Gudang)</label>
              <input 
                type="number" 
                className="form-input" 
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                min="0"
                placeholder="Masukkan jumlah fisik saat ini"
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                Jika Anda mengubah kuantitas di sini, stok utama produk juga akan otomatis disesuaikan (bertambah/berkurang).
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleEditSave} disabled={newQty === '' || Number(newQty) < 0}>Simpan</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
