import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useAuthStore } from '../../store/store';
import { Check, X, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { AppCard, AppButton, AppDialog, AppBadge, AppEmptyState, AppTextarea } from '../ui';
import { notificationService } from '../../services/notificationService';
import { syncService } from '../../services/syncService';

export default function WarehouseApproval() {
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [productsMap, setProductsMap] = useState({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, approval: null, isApprove: false });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const pendingApprovals = await db.approvals.where('status').equals('Pending').toArray();
      const pendingRestocks = await db.restock_requests.where('status').equals('Pending Approval').toArray();
      const allProducts = await db.products.toArray();
      
      const pMap = {};
      allProducts.forEach(p => pMap[p.id] = p);
      
      const mappedRestocks = pendingRestocks.map(r => ({
        id: r.id,
        _table: 'restock_requests',
        type: 'RESTOCK_REQUEST',
        status: 'Pending',
        requested_by: r.created_by,
        approved_by: r.approved_by,
        request_payload: JSON.stringify({
          product_id: r.product_id,
          qty: r.qty,
          notes: r.reason,
          priority: r.priority
        }),
        created_at: r.created_at
      }));

      const combined = [
        ...pendingApprovals.map(a => ({...a, _table: 'approvals'})),
        ...mappedRestocks
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setProductsMap(pMap);
      setApprovals(combined);
    } catch (err) {
      console.error(err);
    }
    setIsLoadingData(false);
  };

  const handleActionClick = (approval, isApprove) => {
    setRejectReason('');
    setConfirmModal({ isOpen: true, approval, isApprove });
  };

  const executeAction = async () => {
    const { approval, isApprove } = confirmModal;
    if (!approval) return;

    try {
      setLoading(true);
      const newStatus = isApprove ? 'Approved' : 'Rejected';
      const now = new Date().toISOString();

      await db.transaction('rw', db.approvals, db.restock_requests, db.batches, db.products, db.audit_logs, db.sync_queue, async () => {
        const makeQueueItem = (entity, action, payload) => ({
          id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          idempotency_key: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          entity,
          action,
          payload,
          local_version: 1,
          retry_count: 0,
          status: 'PENDING',
          last_error: null,
          created_at: now,
          updated_at: now,
          next_retry_at: now
        });

        if (approval._table === 'restock_requests') {
          await db.restock_requests.update(approval.id, {
            status: newStatus === 'Approved' ? 'Approved' : 'Rejected',
            approved_by: user.id
          });
          await db.sync_queue.add(makeQueueItem('restock_requests', 'UPDATE', { id: approval.id, status: newStatus === 'Approved' ? 'Approved' : 'Rejected', approved_by: user.id }));

          const payload = JSON.parse(approval.request_payload);
          
          let batchId = null;
          
          if (isApprove) {
            batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const newBatch = {
              id: batchId,
              product_id: payload.product_id,
              batch_number: `RESTOCK-${new Date().getTime().toString().slice(-6)}`,
              qty: payload.qty,
              in_date: now,
              exp_date: '',
              status: 'Aktif',
              created_at: now
            };
            await db.batches.add(newBatch);
            await db.sync_queue.add(makeQueueItem('batches', 'CREATE', newBatch));

            const product = await db.products.get(payload.product_id);
            if (product) {
              const newStock = product.stock + payload.qty;
              await db.products.update(product.id, { stock: newStock });
              await db.sync_queue.add(makeQueueItem('products', 'UPDATE', { id: product.id, stock: newStock }));
            }
          }

          const auditLog = {
            id: `audit-${Date.now()}`,
            action: isApprove ? 'APPROVE_RESTOCK' : 'REJECT_RESTOCK',
            user_id: user.id,
            user_name: user.name || user.username,
            user_role: user.role,
            product_id: payload.product_id,
            batch_id: batchId,
            details: `${isApprove ? 'Disetujui' : 'Ditolak'} permintaan restock sejumlah ${payload.qty}. ${!isApprove ? 'Alasan: ' + rejectReason : ''}`,
            created_at: now
          };
          await db.audit_logs.add(auditLog);
          await db.sync_queue.add(makeQueueItem('audit_logs', 'CREATE', auditLog));
        } else {
          // RECEIVE_GOODS
          await db.approvals.update(approval.id, {
            status: newStatus,
            approved_by: user.id
          });
          await db.sync_queue.add(makeQueueItem('approvals', 'UPDATE', { id: approval.id, status: newStatus, approved_by: user.id }));

          if (approval.type === 'RECEIVE_GOODS') {
            const payload = JSON.parse(approval.request_payload);
            
            if (isApprove) {
              const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              const newBatch = {
                id: batchId,
                product_id: payload.product_id,
                batch_number: payload.batch_number,
                qty: payload.qty,
                in_date: payload.in_date,
                exp_date: payload.exp_date,
                status: 'Aktif',
                created_at: now
              };
              await db.batches.add(newBatch);
              await db.sync_queue.add(makeQueueItem('batches', 'CREATE', newBatch));

              const product = await db.products.get(payload.product_id);
              if (product) {
                const newStock = product.stock + payload.qty;
                await db.products.update(product.id, { stock: newStock });
                await db.sync_queue.add(makeQueueItem('products', 'UPDATE', { id: product.id, stock: newStock }));
              }

              const auditLog = {
                id: `audit-${Date.now()}`,
                action: 'APPROVE_RECEIVE_GOODS',
                user_id: user.id,
                user_name: user.name || user.username,
                user_role: user.role,
                product_id: payload.product_id,
                batch_id: batchId,
                details: `Disetujui penerimaan barang sejumlah ${payload.qty} untuk batch ${payload.batch_number}`,
                created_at: now
              };
              await db.audit_logs.add(auditLog);
              await db.sync_queue.add(makeQueueItem('audit_logs', 'CREATE', auditLog));
            } else {
              const auditLog = {
                id: `audit-${Date.now()}`,
                action: 'REJECT_RECEIVE_GOODS',
                user_id: user.id,
                user_name: user.name || user.username,
                user_role: user.role,
                product_id: payload.product_id,
                batch_id: null,
                details: `Ditolak penerimaan barang sejumlah ${payload.qty} untuk batch ${payload.batch_number}. Alasan: ${rejectReason || 'Tidak ada'}`,
                created_at: now
              };
              await db.audit_logs.add(auditLog);
              await db.sync_queue.add(makeQueueItem('audit_logs', 'CREATE', auditLog));
            }
          }
        }
      });

      setTimeout(() => { syncService.processQueue(); }, 100);

      const payload = JSON.parse(approval.request_payload);
      const prod = productsMap[payload.product_id];
      await notificationService.notifyStaff(approval.requested_by, {
        title: isApprove ? 'Request Disetujui' : 'Request Ditolak',
        message: isApprove 
          ? `Request ${approval.type === 'RESTOCK_REQUEST' ? 'Restock' : 'Penerimaan'} ${payload.qty}x ${prod?.name || 'Produk'} telah disetujui.` 
          : `Request ${approval.type === 'RESTOCK_REQUEST' ? 'Restock' : 'Penerimaan'} ${payload.qty}x ${prod?.name || 'Produk'} ditolak. Alasan: ${rejectReason || 'Tidak ada'}`,
        type: isApprove ? 'APPROVAL_SUCCESS' : 'APPROVAL_REJECT',
        reference_id: approval.id
      });

      alert(`Permintaan berhasil di-${newStatus}.`);
      setConfirmModal({ isOpen: false, approval: null, isApprove: false });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
          <div>Memuat data persetujuan...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Menunggu Persetujuan</h2>
        <AppBadge variant="warning">{approvals.length} Pending</AppBadge>
      </div>

      {approvals.length === 0 ? (
        <AppEmptyState 
          icon={<Clock size={48} />}
          title="Tidak ada permintaan"
          description="Tidak ada permintaan yang menunggu persetujuan."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {approvals.map(app => {
            const payload = JSON.parse(app.request_payload);
            const product = productsMap[payload.product_id];
            
            return (
              <AppCard key={app.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <AppBadge variant={app.type === 'RESTOCK_REQUEST' ? 'secondary' : 'primary'}>
                        {app.type.replace('_', ' ')}
                      </AppBadge>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(app.created_at).toLocaleString()}</span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px 0' }}>{product?.name || 'Produk Tidak Ditemukan'}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                      Barcode: {product?.barcode || '-'} • Kategori: {product?.category || '-'}
                    </p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kuantitas</div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{app.type === 'RECEIVE_GOODS' ? '+' : ''} {payload.qty} {product?.unit || 'Pcs'}</div>
                  </div>
                  
                  {app.type === 'RECEIVE_GOODS' ? (
                    <>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>No. Batch</div>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>{payload.batch_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tanggal Expired</div>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: payload.exp_date ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {payload.exp_date ? new Date(payload.exp_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Tidak Ada'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Prioritas</div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: payload.priority === 'Tinggi' ? 'var(--danger)' : 'var(--primary)' }}>
                        {payload.priority || 'Normal'}
                      </div>
                    </div>
                  )}
                  
                  {payload.notes && (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Catatan / Alasan</div>
                      <div style={{ fontSize: '14px' }}>{payload.notes}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <AppButton 
                    variant="outline" 
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    onClick={() => handleActionClick(app, false)}
                    disabled={loading}
                    icon={<X size={16} />}
                  >
                    Tolak
                  </AppButton>
                  <AppButton 
                    variant="primary" 
                    onClick={() => handleActionClick(app, true)}
                    loading={loading}
                    icon={<Check size={16} />}
                  >
                    {app.type === 'RESTOCK_REQUEST' ? 'Setujui Restock' : 'Setujui & Buat Batch'}
                  </AppButton>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}

      <AppDialog 
        isOpen={confirmModal.isOpen} 
        onClose={() => !loading && setConfirmModal({ isOpen: false, approval: null, isApprove: false })} 
        title={confirmModal.isApprove ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
        maxWidth="400px"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            backgroundColor: confirmModal.isApprove ? 'var(--primary-light)' : 'var(--danger-light)', 
            color: confirmModal.isApprove ? 'var(--primary)' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            {confirmModal.isApprove ? <Check size={32} /> : <AlertCircle size={32} />}
          </div>
          <h3 style={{ margin: '0 0 8px 0' }}>
            {confirmModal.isApprove ? "Setujui Permintaan?" : "Tolak Permintaan?"}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            {confirmModal.isApprove 
              ? (confirmModal.approval?.type === 'RESTOCK_REQUEST' ? "Permintaan restock akan disetujui." : "Sistem akan membuat batch baru dan menambah kuantitas stok produk.")
              : "Permintaan ini akan dibatalkan secara permanen."}
          </p>
          
          {!confirmModal.isApprove && (
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <AppTextarea
                label="Alasan Penolakan (Opsional)"
                placeholder="Tulis alasan..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows="2"
              />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <AppButton 
              variant="outline" 
              onClick={() => setConfirmModal({ isOpen: false, approval: null, isApprove: false })}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Batal
            </AppButton>
            <AppButton 
              variant={confirmModal.isApprove ? 'primary' : 'danger'} 
              onClick={executeAction}
              loading={loading}
              style={{ flex: 1 }}
            >
              {confirmModal.isApprove ? "Ya, Setujui" : "Ya, Tolak"}
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
