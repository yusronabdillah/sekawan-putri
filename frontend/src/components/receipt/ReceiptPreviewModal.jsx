import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import ReceiptTemplate from './ReceiptTemplate';
import { PrintManager } from '../../services/printer/PrintManager';
import { PDFExporter } from '../../services/printer/PDFExporter';
import { Printer, Download, CheckCircle } from 'lucide-react';
import { usePrinterStore } from '../../store/store';

export default function ReceiptPreviewModal({ isOpen, onClose, transaction, isNewTransaction = false }) {
  const { config } = usePrinterStore();
  const [isExporting, setIsExporting] = useState(false);

  // Auto-print logic for new transactions
  useEffect(() => {
    if (isOpen && isNewTransaction && config.autoPrint) {
      // Small delay to ensure render
      setTimeout(() => {
        PrintManager.printReceipt();
      }, 500);
    }
  }, [isOpen, isNewTransaction, config.autoPrint]);

  const handlePrint = () => {
    PrintManager.printReceipt();
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const invoiceNo = transaction.id ? transaction.id.split('-')[0].toUpperCase() : 'INV';
      await PDFExporter.downloadReceipt('receipt-capture-area', `struk-${invoiceNo}.pdf`);
    } catch (error) {
      alert('Gagal mendownload PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNewTransaction ? "Transaksi Berhasil" : "Pratinjau Struk"}>
      
      {isNewTransaction && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 8px' }} />
          <h2 style={{ color: 'var(--success)', fontSize: '20px', fontWeight: 'bold' }}>Pembayaran Sukses!</h2>
        </div>
      )}

      {/* Preview Area Container */}
      <div 
        style={{ 
          backgroundColor: '#f1f5f9', // Gray background for contrast
          padding: '24px 16px', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          maxHeight: '50vh',
          overflowY: 'auto',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}
      >
        {/* We wrap the receipt template in a div with an ID for PDF targeting */}
        <div id="receipt-capture-area">
          <ReceiptTemplate transaction={transaction} config={config} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          className="btn btn-primary btn-block" 
          onClick={handlePrint}
          style={{ height: '48px', fontWeight: 'bold' }}
        >
          <Printer size={20} style={{ marginRight: '8px' }} /> Cetak Struk
        </button>
        
        <button 
          className="btn btn-outline btn-block" 
          onClick={handleDownloadPDF}
          disabled={isExporting}
          style={{ height: '48px', fontWeight: '600', color: 'var(--text-muted)' }}
        >
          <Download size={20} style={{ marginRight: '8px' }} /> 
          {isExporting ? 'Memproses PDF...' : 'Download PDF'}
        </button>
        
        <button 
          className="btn btn-secondary btn-block" 
          onClick={onClose}
          style={{ height: '48px', fontWeight: '600', marginTop: '8px' }}
        >
          {isNewTransaction ? 'Selesai & Transaksi Baru' : 'Tutup'}
        </button>
      </div>
    </Modal>
  );
}
