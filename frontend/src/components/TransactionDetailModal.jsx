import React, { useState } from 'react';
import Modal from './Modal';
import { exportService } from '../services/exportService';
import { Printer, Receipt, User, UserCheck, CreditCard, Package, DollarSign } from 'lucide-react';
import ReceiptPreviewModal from './receipt/ReceiptPreviewModal';

export default function TransactionDetailModal({ isOpen, onClose, tx }) {
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);

  if (!tx) return null;

  const date = new Date(tx.created_at);
  const formattedDate = date.toLocaleDateString('id-ID');
  const formattedTime = date.toLocaleTimeString('id-ID');

  const formatInvoiceNumber = (t) => {
    if (!t) return 'INV-???';
    const raw = t.invoice_number || t.invoiceNo || t.id || '';
    if (!raw) return 'INV-???';
    if (raw.startsWith('INV-')) return raw;
    if (raw.startsWith('TEST-')) return raw;
    if (raw.includes('-')) {
      return `INV-${raw.split('-')[0].toUpperCase()}`;
    }
    return `INV-${raw.toUpperCase()}`;
  };

  const invoiceNo = formatInvoiceNumber(tx);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Transaksi">
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        {/* ... (rest of the card content) ... */}
        <div className="flex justify-between items-start" style={{ marginBottom: '16px' }}>
          <div className="flex gap-3">
            <div style={{ color: 'var(--primary)', marginTop: '4px' }}>
              <Receipt size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>Invoice: {invoiceNo}</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formattedDate} {formattedTime}</div>
            </div>
          </div>
          <span className="badge" style={{ 
            backgroundColor: tx.status === 'COMPLETED' ? 'var(--secondary-light)' : (tx.status === 'VOID' ? 'var(--danger-light)' : 'var(--warning-light)'),
            color: tx.status === 'COMPLETED' ? 'var(--secondary)' : (tx.status === 'VOID' ? 'var(--danger)' : 'var(--warning)')
          }}>
            {tx.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px', marginBottom: '8px' }}>
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              <User size={16} /> Pelanggan
            </div>
            <div style={{ fontWeight: '600' }}>{tx.customer_name}</div>
          </div>
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              <UserCheck size={16} /> Kasir
            </div>
            <div style={{ fontWeight: '600' }}>{tx.cashier_name}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              <CreditCard size={16} /> Metode Pembayaran
            </div>
            <div style={{ fontWeight: '600' }}>{tx.payment_method}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h4 className="flex items-center gap-2" style={{ margin: '0 0 12px 0' }}>
          <Package size={18} style={{ color: 'var(--primary)' }} /> Daftar Produk
        </h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {tx.items && tx.items.map((item, idx) => (
            <div key={idx} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ 
                fontWeight: '500', 
                marginBottom: '6px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.product_name}
              </div>
              <div className="flex justify-between items-end">
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {item.qty} × Rp {(item.price || 0).toLocaleString('id-ID')}
                </div>
                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                  Rp {(item.subtotal || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed var(--border)', fontSize: '14px' }}>
          <div className="flex justify-between" style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontWeight: '500' }}>Rp {(tx.subtotal || 0).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between" style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Diskon</span>
            <span style={{ fontWeight: '500' }}>Rp {tx.discount ? (tx.discount || 0).toLocaleString('id-ID') : 0}</span>
          </div>
          <div className="flex justify-between" style={{ marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Pajak</span>
            <span style={{ fontWeight: '500' }}>Rp {tx.tax ? (tx.tax || 0).toLocaleString('id-ID') : 0}</span>
          </div>
          <div className="flex justify-between items-center" style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <span className="flex items-center gap-2" style={{ fontSize: '16px', fontWeight: '600' }}>
              <DollarSign size={20} style={{ color: 'var(--primary)' }} /> Grand Total
            </span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>Rp {(tx.total_amount || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <button className="btn btn-outline" onClick={() => setIsReceiptPreviewOpen(true)}>
          <Printer size={18} style={{ marginRight: '8px' }} /> Cetak Ulang
        </button>
        <button className="btn btn-primary" onClick={() => alert('Fitur Refund/Void tersedia untuk level Manager/Owner')}>
          Tindakan Lain
        </button>
      </div>

      {isReceiptPreviewOpen && (
        <ReceiptPreviewModal 
          isOpen={isReceiptPreviewOpen}
          onClose={() => setIsReceiptPreviewOpen(false)}
          transaction={tx}
          isNewTransaction={false}
        />
      )}
    </Modal>
  );
}
