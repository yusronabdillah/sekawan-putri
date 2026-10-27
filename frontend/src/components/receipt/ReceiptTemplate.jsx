import React from 'react';

const ReceiptTemplate = React.forwardRef(({ transaction, config }, ref) => {
  if (!transaction) return null;

  const {
    paperSize = '58',
    showAddress = true,
    footerText = 'Terima kasih telah berbelanja\nSimpan struk ini sebagai\nbukti pembayaran',
    marginTop = 0,
    marginBottom = 10,
    fontSize = 'normal'
  } = config || {};

  // Widths mapping for paper size:
  // 58mm paper / 57mm EDC roll has 40mm safe printable width (avoids left/right cut off)
  // 80mm paper has 70mm safe printable width
  const is80 = paperSize === '80';
  const printableWidth = is80 ? '70mm' : '40mm';
  const baseFontSize = is80 
    ? (fontSize === 'compact' ? '10.5px' : '11.5px')
    : (fontSize === 'compact' ? '8.5px' : '9.5px');
  const headerFontSize = is80
    ? (fontSize === 'compact' ? '12.5px' : '13.5px')
    : (fontSize === 'compact' ? '10.5px' : '11.5px');
  
  const formatRupiah = (val) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

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

  const invoiceNo = formatInvoiceNumber(transaction);
  const dateStr = transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';
  const timeStr = transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div 
      ref={ref}
      className="receipt-print-area"
      style={{
        width: printableWidth,
        maxWidth: printableWidth,
        margin: `${marginTop}mm auto ${marginBottom}mm auto`,
        fontFamily: "'Consolas', 'Courier New', Courier, monospace",
        color: '#000',
        backgroundColor: '#fff',
        fontSize: baseFontSize,
        lineHeight: '1.2',
        padding: '0 1.5mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: headerFontSize, marginBottom: '2px' }}>SEKAWAN PUTRI POS</div>
        {showAddress && (
          <div style={{ fontSize: baseFontSize }}>
            Jl. Tirto Rahayu No.12 A, Dau<br />
            Telp/WA: 0857-7558-6209
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* INFO TRANSAKSI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
        <span>Tgl : {dateStr}</span>
        <span>Jam: {timeStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
        <span>No  : {invoiceNo}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
        <span>Ksr : {transaction.cashier_name || 'Kasir'}</span>
        <span>Mtd: {transaction.payment_method || 'CASH'}</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* ITEMS */}
      <div style={{ marginBottom: '8px' }}>
        {transaction.items && transaction.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '6px' }}>
            {/* Product Name wraps naturally */}
            <div style={{ textAlign: 'left', wordBreak: 'break-word', fontWeight: 'bold' }}>
              {item.product_name || item.name || 'Produk'}
            </div>
            {/* Qty x Price & Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                {item.qty} x {formatRupiah(item.price)}
              </span>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {formatRupiah(item.price * item.qty)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* SUMMARY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span>Subtotal</span>
        <span>{formatRupiah(transaction.subtotal || transaction.total_amount)}</span>
      </div>
      {transaction.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>Diskon</span>
          <span>-{formatRupiah(transaction.discount)}</span>
        </div>
      )}
      {transaction.tax > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>Pajak</span>
          <span>{formatRupiah(transaction.tax)}</span>
        </div>
      )}
      
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 'bold', fontSize: headerFontSize }}>
        <span>TOTAL BAYAR</span>
        <span>{formatRupiah(transaction.total_amount)}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span>TUNAI</span>
        <span>{formatRupiah(transaction.paid_amount || transaction.total_amount)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span>KEMBALI</span>
        <span>{formatRupiah(transaction.change_amount || 0)}</span>
      </div>

      <div style={{ borderTop: '2px dashed #000', margin: '12px 0' }}></div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', whiteSpace: 'pre-wrap', marginTop: '12px', fontSize: baseFontSize }}>
        {footerText}
      </div>
      
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#fff' }}>
        .
      </div>
    </div>
  );
});

export default ReceiptTemplate;
