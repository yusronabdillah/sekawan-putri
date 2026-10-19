/**
 * ESC/POS Builder for Thermal Printers (58mm & 80mm)
 * Formats receipts into raw ESC/POS byte commands for Direct Printing (RawBT, Bluetooth, USB)
 */

export const EscPosBuilder = {
  buildReceipt: (transaction, config = {}) => {
    const {
      paperSize = '58',
      showAddress = true,
      footerText = 'Terima kasih telah berbelanja\nSimpan struk ini sebagai bukti pembayaran',
    } = config;

    const lineWidth = paperSize === '80' ? 42 : 32;

    const ESC = '\x1B';
    const GS = '\x1D';

    const CMD = {
      INIT: `${ESC}@`,
      ALIGN_LEFT: `${ESC}a\x00`,
      ALIGN_CENTER: `${ESC}a\x01`,
      ALIGN_RIGHT: `${ESC}a\x02`,
      BOLD_ON: `${ESC}E\x01`,
      BOLD_OFF: `${ESC}E\x00`,
      DOUBLE_ON: `${GS}!\x11`,
      DOUBLE_OFF: `${GS}!\x00`,
      CUT: `${GS}V\x41\x00`
    };

    const padRow = (left, right, width = lineWidth) => {
      const leftStr = String(left || '');
      const rightStr = String(right || '');
      const spaceNeeded = width - leftStr.length - rightStr.length;
      if (spaceNeeded <= 0) {
        return leftStr.slice(0, Math.max(1, width - rightStr.length - 1)) + ' ' + rightStr + '\n';
      }
      return leftStr + ' '.repeat(spaceNeeded) + rightStr + '\n';
    };

    const separator = '-'.repeat(lineWidth) + '\n';

    const formatRupiah = (val) => {
      return 'Rp ' + (val || 0).toLocaleString('id-ID');
    };

    const getInvoiceNumber = (t) => {
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

    const invoiceNo = getInvoiceNumber(transaction);
    const dateStr = transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('id-ID') : '-';
    const timeStr = transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

    let out = '';
    out += CMD.INIT;

    // HEADER
    out += CMD.ALIGN_CENTER;
    out += CMD.BOLD_ON;
    out += CMD.DOUBLE_ON;
    out += 'SEKAWAN PUTRI POS\n';
    out += CMD.DOUBLE_OFF;
    out += CMD.BOLD_OFF;

    if (showAddress) {
      out += 'Jl. Tirto Rahayu No.12 A, Dau\n';
      out += 'Telp/WA: 0857-7558-6209\n';
    }

    out += separator;

    // TRANSACTION INFO
    out += CMD.ALIGN_LEFT;
    out += padRow(`Tgl : ${dateStr}`, `Jam: ${timeStr}`);
    out += padRow(`No  : ${invoiceNo}`, '');
    out += padRow(`Ksr : ${transaction.cashier_name || 'Kasir'}`, `Mtd: ${transaction.payment_method || 'CASH'}`);

    out += separator;

    // ITEMS
    if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((item) => {
        const name = item.product_name || item.name || 'Produk';
        out += `${name}\n`;
        const left = `  ${item.qty} x ${formatRupiah(item.price)}`;
        const right = formatRupiah((item.price || 0) * (item.qty || 1));
        out += padRow(left, right);
      });
    }

    out += separator;

    // SUMMARY
    const subtotal = transaction.subtotal || transaction.total_amount || 0;
    out += padRow('Subtotal', formatRupiah(subtotal));

    if (transaction.discount > 0) {
      out += padRow('Diskon', `-${formatRupiah(transaction.discount)}`);
    }
    if (transaction.tax > 0) {
      out += padRow('Pajak', formatRupiah(transaction.tax));
    }

    out += CMD.BOLD_ON;
    out += padRow('GRAND TOTAL', formatRupiah(transaction.total_amount || subtotal));
    out += CMD.BOLD_OFF;

    const paid = transaction.payment_amount || transaction.paid_amount || transaction.total_amount || 0;
    const change = transaction.change_amount || 0;
    out += padRow('Dibayar', formatRupiah(paid));
    out += padRow('Kembalian', formatRupiah(change));

    out += separator;

    // FOOTER
    out += CMD.ALIGN_CENTER;
    if (footerText) {
      out += footerText + '\n';
    }

    // FEED & CUT
    out += '\n\n\n\n';
    if (paperSize === '80') {
      out += CMD.CUT;
    }

    // Convert string to Uint8Array using Latin1 char codes
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) {
      bytes[i] = out.charCodeAt(i) & 0xff;
    }
    return bytes;
  },

  toBase64: (uint8Array) => {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }
};
