import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import Modal from './Modal';
import { ShoppingCart, CheckCircle, Printer, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../store/store';
import ReceiptPreviewModal from './receipt/ReceiptPreviewModal';
import { syncService } from '../services/syncService';
import qrisImage from '../assets/qrisnafa.jpeg';

export default function CheckoutModal({ isOpen, onClose, onEditPesanan, cart, total, clearCart }) {
  const { user } = useAuthStore();
  const [step, setStep] = useState('PAYMENT'); // 'PAYMENT', 'SUCCESS'
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  
  // LOG BUKTI SESUAI PERMINTAAN USER:
  if (paymentMethod === 'QRIS') {
    console.log("[BUKTI AUDIT] Nilai src QRIS saat dirender:", qrisImage);
  }
  
  const [invoiceData, setInvoiceData] = useState(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [lastTransactionObj, setLastTransactionObj] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('PAYMENT');
      setPaymentMethod('CASH');
      setPaidAmount('');
      setInvoiceData(null);
      setIsReceiptPreviewOpen(false);
      setLastTransactionObj(null);
    }
  }, [isOpen]);

  const grandTotal = total; // No tax

  const handleQuickAmount = (amount) => {
    setPaidAmount(amount.toString());
  };

  const paidNumeric = parseInt(paidAmount.replace(/\D/g, ''), 10) || 0;
  const change = paidNumeric - grandTotal;
  const isPaidValid = paymentMethod !== 'CASH' || paidNumeric >= grandTotal;

  const handleCheckout = async () => {
    if (!isPaidValid) return;

    const txId = uuidv4();
    const invoiceNo = `INV-${txId.split('-')[0].toUpperCase()}`;
    const now = new Date();

    const transaction = {
      id: txId,
      invoice_number: invoiceNo,
      cashier_id: user.id,
      cashier_name: user.name || user.username,
      customer_id: null,
      subtotal: total,
      discount: 0,
      tax: 0,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      status: 'COMPLETED',
      created_at: now.toISOString(),
      items: cart.map(item => {
        const discountedPrice = item.price - (item.price * (item.discount || 0) / 100);
        return {
          product_id: item.id,
          product_name: item.name,
          qty: item.qty,
          price: discountedPrice,
          subtotal: discountedPrice * item.qty
        };
      })
    };

    const nowStr = now.toISOString();
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
      created_at: nowStr,
      updated_at: nowStr,
      next_retry_at: nowStr
    });

    try {
      // PRE-VALIDATION: Check stock before transaction
      for (const item of cart) {
        const p = await db.products.get(item.id);
        if (!p || p.stock < item.qty) {
          throw new Error(`Stok tidak mencukupi untuk ${item.name}. Sisa stok: ${p ? p.stock : 0}, Diminta: ${item.qty}`);
        }
      }

      // Save to local and queue
      await db.transaction('rw', db.products, db.transactions, db.transaction_items, db.stock_movements, db.sync_queue, db.batches, db.audit_logs, async () => {
        await db.transactions.add({
          id: transaction.id,
          invoice_number: invoiceNo,
          cashier_id: transaction.cashier_id,
          customer_id: transaction.customer_id,
          status: transaction.status,
          created_at: transaction.created_at,
          total_amount: transaction.total_amount,
          subtotal: transaction.subtotal,
          discount: transaction.discount,
          tax: transaction.tax,
          payment_method: transaction.payment_method
        });

        for (const item of cart) {
          // FEFO Logic
          let remainingQty = item.qty;
          
          const batches = await db.batches
            .where('product_id').equals(item.id)
            .filter(b => b.qty > 0)
            .toArray();
            
          batches.sort((a, b) => {
            if (!a.exp_date) return 1;
            if (!b.exp_date) return -1;
            return new Date(a.exp_date) - new Date(b.exp_date);
          });
          
          for (const batch of batches) {
            if (remainingQty <= 0) break;
            
            const deductQty = Math.min(batch.qty, remainingQty);
            const newBatchQty = batch.qty - deductQty;
            
            await db.batches.update(batch.id, { qty: newBatchQty });
            await db.sync_queue.add(makeQueueItem('batches', 'UPDATE', { id: batch.id, qty: newBatchQty }));
            
            const auditLog = {
              id: `audit-${Date.now()}-${batch.id}`,
              action: 'FEFO_DEDUCTION',
              user_id: user.id,
              user_name: user.name || user.username,
              user_role: user.role,
              product_id: item.id,
              batch_id: batch.id,
              details: `Penjualan kasir mengurangi ${deductQty} dari batch ${batch.batch_number}`,
              created_at: now.toISOString()
            };
            await db.audit_logs.add(auditLog);
            await db.sync_queue.add(makeQueueItem('audit_logs', 'CREATE', auditLog));
            
            remainingQty -= deductQty;
          }

          // Update product stock (cache)
          const p = await db.products.get(item.id);
          if (p) {
            const newStock = p.stock - item.qty;
            await db.products.update(item.id, { stock: newStock });
            await db.sync_queue.add(makeQueueItem('products', 'UPDATE', { id: item.id, stock: newStock }));
          }
          
          const discountedPrice = item.price - (item.price * (item.discount || 0) / 100);
          const txItem = {
            id: uuidv4(),
            transaction_id: transaction.id,
            product_id: item.id,
            qty: item.qty,
            price: discountedPrice,
            subtotal: discountedPrice * item.qty
          };
          await db.transaction_items.add(txItem);
          await db.sync_queue.add(makeQueueItem('transaction_items', 'CREATE', txItem));
          
          const stockMove = {
            id: uuidv4(),
            product_id: item.id,
            type: 'OUT',
            created_at: now.toISOString()
          };
          await db.stock_movements.add(stockMove);
          await db.sync_queue.add(makeQueueItem('stock_movements', 'CREATE', stockMove));
        }
        
        await db.sync_queue.add(makeQueueItem('transactions', 'CREATE', transaction));
      });
    } catch (error) {
      console.error("Transaction Error:", error);
      alert(error.message || "Terjadi kesalahan saat memproses pembayaran. Cek ketersediaan stok.");
      return; // Stop checkout process
    }

    // Trigger sync process in background
    setTimeout(() => {
      syncService.processQueue();
    }, 100);

    setInvoiceData({
      invoiceNo,
      cashierName: user.name || user.username,
      method: paymentMethod,
      total: grandTotal,
      paid: paymentMethod === 'CASH' ? paidNumeric : grandTotal,
      change: paymentMethod === 'CASH' ? change : 0,
      date: now.toLocaleDateString('id-ID'),
      time: now.toLocaleTimeString('id-ID')
    });
    
    // Add additional props needed by ReceiptPreviewModal
    setLastTransactionObj({
      ...transaction,
      id: invoiceNo, // Use nice invoiceNo instead of uuid for display
      cashier_name: user.name || user.username,
      paid_amount: paymentMethod === 'CASH' ? paidNumeric : grandTotal,
      change_amount: paymentMethod === 'CASH' ? change : 0,
      items: cart.map(item => {
        const discountedPrice = item.price - (item.price * (item.discount || 0) / 100);
        return {
          ...item,
          product_name: item.name,
          price: discountedPrice,
          subtotal: discountedPrice * item.qty
        };
      })
    });
    
    setStep('SUCCESS');
    clearCart();
  };

  const formatRupiah = (val) => {
    if (!val) return '';
    const numeric = val.replace(/\D/g, '');
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handlePaidChange = (e) => {
    setPaidAmount(formatRupiah(e.target.value));
  };

  // Generate quick amount buttons intelligently
  const getQuickAmounts = () => {
    if (grandTotal === 0) return [20000, 50000, 100000];
    
    const amounts = [];
    
    // Nearest tens/hundreds
    if (grandTotal <= 20000) amounts.push(20000);
    if (grandTotal <= 50000) amounts.push(50000);
    if (grandTotal <= 100000) amounts.push(100000);
    
    // Add next 50k or 100k increments if needed
    if (amounts.length < 3) {
      const ceil50 = Math.ceil(grandTotal / 50000) * 50000;
      if (!amounts.includes(ceil50) && ceil50 > grandTotal) amounts.push(ceil50);
      
      const ceil100 = Math.ceil(grandTotal / 100000) * 100000;
      if (!amounts.includes(ceil100) && ceil100 > grandTotal) amounts.push(ceil100);
    }
    
    // Cap at 3 items
    return amounts.slice(0, 3);
  };

  const quickAmounts = getQuickAmounts();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'SUCCESS' ? 'Transaksi Berhasil' : 'Pembayaran'} maxWidth="800px">
      
      {step === 'PAYMENT' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
          
          <button 
            className="btn btn-outline" 
            style={{ marginBottom: '16px', display: 'flex', gap: '8px', width: 'fit-content', border: 'none', padding: '0', color: 'var(--text-muted)' }} 
            onClick={onEditPesanan || onClose}
          >
            <ArrowLeft size={20} /> Edit Pesanan
          </button>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* KOLOM KIRI: TOTAL & RINGKASAN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* TOTAL BAYAR AREA */}
                <div style={{ textAlign: 'center', backgroundColor: 'var(--primary-light)', padding: '16px', borderRadius: '16px', border: '1px solid var(--primary)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '700', marginBottom: '4px' }}>TOTAL BAYAR</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', lineHeight: '1.2' }}>
                    Rp {(grandTotal || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* RINGKASAN PRODUK */}
                <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-main)', fontWeight: '700' }}>
                    Ringkasan Belanja
                  </div>
                  <div style={{ flex: 1, minHeight: '120px', maxHeight: '30vh', overflowY: 'auto', padding: '0 16px' }}>
                    {cart.map((item, idx) => (
                      <div key={item.id + idx} style={{ padding: '12px 0', borderBottom: idx !== cart.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', wordBreak: 'break-word', lineHeight: '1.4' }}>
                          {item.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
                            x{item.qty}
                          </div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>
                            Rp {(item.qty * item.price).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: PEMBAYARAN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* METODE PEMBAYARAN */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>METODE PEMBAYARAN</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <button className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0 8px', fontSize: '14px' }} onClick={() => setPaymentMethod('CASH')}>Tunai</button>
                    <button className={`btn ${paymentMethod === 'QRIS' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0 8px', fontSize: '14px' }} onClick={() => setPaymentMethod('QRIS')}>QRIS</button>
                    <button className={`btn ${paymentMethod === 'TRANSFER' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0 8px', fontSize: '14px' }} onClick={() => setPaymentMethod('TRANSFER')}>Transfer</button>
                  </div>
                </div>

                {/* LOGIC METODE PEMBAYARAN */}
                {paymentMethod === 'QRIS' && (
                  <div className="card animate-fade-in" style={{ padding: '16px', textAlign: 'center', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: 'var(--primary)', textTransform: 'uppercase' }}>QRIS</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
                      <img 
                        src={qrisImage} 
                        alt="QRIS Nafa Frozen Food" 
                        style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain', borderRadius: '12px' }} 
                      />
                    </div>
                    
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '12px', width: '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Nominal Pembayaran</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>Rp {(grandTotal || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'TRANSFER' && (
                  <div className="card" style={{ padding: '24px 16px', textAlign: 'center', borderStyle: 'dashed', margin: 0 }}>
                    <h3 style={{ color: 'var(--text-muted)' }}>Upload Bukti Transfer</h3>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>(Fitur segera hadir)</p>
                  </div>
                )}

                {paymentMethod === 'CASH' && (
                  <div className="card" style={{ padding: '16px', borderColor: 'var(--primary)', margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label className="form-label" style={{ marginBottom: '8px' }}>Nominal Dibayar (Rp)</label>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', padding: '12px 16px', border: '2px solid var(--primary)' }}>
                      <span style={{ fontSize: '20px', fontWeight: '700', marginRight: '8px' }}>Rp</span>
                      <input 
                        type="text" 
                        value={paidAmount}
                        onChange={handlePaidChange}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '24px', fontWeight: '800', outline: 'none', width: '100%' }}
                        inputMode="numeric"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    
                    {/* QUICK AMOUNT */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      <button className="btn btn-outline" style={{ flex: 1, padding: '0 8px', fontSize: '13px', minHeight: '36px', fontWeight: '600' }} onClick={() => handleQuickAmount(grandTotal)}>Uang Pas</button>
                      {quickAmounts.map(amt => (
                        <button key={amt} className="btn btn-outline" style={{ flex: 1, padding: '0 8px', fontSize: '13px', minHeight: '36px' }} onClick={() => handleQuickAmount(amt)}>
                          {(amt/1000).toLocaleString('id-ID')}rb
                        </button>
                      ))}
                    </div>

                    <div style={{ flex: 1 }}></div>

                    {/* KEMBALIAN */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>KEMBALIAN</div>
                      <div className="number-transition" style={{ fontSize: '28px', fontWeight: '800', color: change >= 0 ? 'var(--secondary)' : 'var(--danger)', lineHeight: '1.2' }}>
                        Rp {change >= 0 ? (change || 0).toLocaleString('id-ID') : '0'}
                      </div>
                      {change < 0 && paidNumeric > 0 && (
                        <div className="animate-fade-in" style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>
                          Nominal kurang Rp {Math.abs(change).toLocaleString('id-ID')}!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STICKY BOTTOM */}
          <div style={{ paddingTop: '16px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', marginTop: '8px', flexShrink: 0 }}>
            <button 
              className={`btn btn-block ${isPaidValid ? 'btn-primary' : 'btn-outline'}`} 
              style={{ minHeight: '54px', fontSize: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isPaidValid ? 1 : 0.5, fontWeight: '700' }}
              disabled={!isPaidValid}
              onClick={handleCheckout}
            >
              {paymentMethod === 'CASH' ? (
                <>
                  <ShoppingCart size={20} />
                  {paidNumeric === 0 ? 'Masukkan Nominal' : (isPaidValid ? `Bayar Rp ${(grandTotal || 0).toLocaleString('id-ID')}` : 'Nominal Kurang')}
                </>
              ) : paymentMethod === 'QRIS' ? (
                <>
                  <ShoppingCart size={20} /> Selesaikan Transaksi
                </>
              ) : (
                <>
                  <ShoppingCart size={20} /> Konfirmasi Pembayaran
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* SUCCESS PAGE */}
      {step === 'SUCCESS' && invoiceData && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <CheckCircle size={64} color="var(--secondary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--secondary)', marginBottom: '24px', fontSize: '24px', fontWeight: '800' }}>Pembayaran Berhasil!</h2>
          
          <div className="card" style={{ textAlign: 'left', fontSize: '14px', padding: '16px' }}>
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>No Invoice</span>
              <span style={{ fontWeight: '600' }}>{invoiceData.invoiceNo}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Waktu</span>
              <span style={{ fontWeight: '600' }}>{invoiceData.date} {invoiceData.time}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Kasir</span>
              <span style={{ fontWeight: '600' }}>{invoiceData.cashierName}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Metode</span>
              <span style={{ fontWeight: '600' }}>{invoiceData.method}</span>
            </div>
            
            <div style={{ borderTop: '2px dashed var(--border)', margin: '16px 0' }}></div>
            
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Bayar</span>
              <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--primary)' }}>Rp {(invoiceData.total || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dibayar</span>
              <span style={{ fontWeight: '600' }}>Rp {(invoiceData.paid || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Kembalian</span>
              <span style={{ fontWeight: '600', color: 'var(--secondary)' }}>Rp {(invoiceData.change || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button className="btn btn-outline btn-block" onClick={() => setIsReceiptPreviewOpen(true)} style={{ minHeight: '48px', fontWeight: '600' }}>
              <Printer size={20} style={{ marginRight: '8px' }} /> Cetak Struk
            </button>
            <button className="btn btn-primary btn-block" onClick={onClose} style={{ minHeight: '48px', fontWeight: '600' }}>
              Selesai & Transaksi Baru
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {isReceiptPreviewOpen && lastTransactionObj && (
        <ReceiptPreviewModal 
          isOpen={isReceiptPreviewOpen}
          onClose={() => setIsReceiptPreviewOpen(false)}
          transaction={lastTransactionObj}
          isNewTransaction={true}
        />
      )}

    </Modal>
  );
}
