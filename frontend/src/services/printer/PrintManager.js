import { EscPosBuilder } from './EscPosBuilder';

export const PrintManager = {
  /**
   * Main entrypoint for printing receipts
   * @param {Object} transaction Transaction data
   * @param {Object} config Printer configuration from usePrinterStore
   */
  printReceipt: (transaction = null, config = {}) => {
    // Check if RawBT Direct Print is selected
    if (config?.printMethod === 'rawbt' && transaction) {
      return PrintManager.printRawBT(transaction, config);
    }

    // Default Browser window.print()
    return PrintManager.printBrowser();
  },

  /**
   * Standard Browser Print using CSS @media print
   */
  printBrowser: () => {
    const receiptElement = document.querySelector('.receipt-print-area');
    if (!receiptElement) {
      console.warn('Elemen struk tidak ditemukan, memicu dialog print langsung');
      window.print();
      return;
    }

    let printContainer = document.getElementById('print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = '';
    const clone = receiptElement.cloneNode(true);
    printContainer.appendChild(clone);

    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        if (printContainer) {
          printContainer.innerHTML = '';
        }
      }, 1000);
    }, 100);
  },

  /**
   * Direct RawBT Print for Android Tablets (Redmi Pad / Phones)
   * Sends ESC/POS binary data directly to RawBT service
   */
  printRawBT: async (transaction, config) => {
    try {
      const bytes = EscPosBuilder.buildReceipt(transaction, config);
      const base64 = EscPosBuilder.toBase64(bytes);

      // Method 1: WebSocket to local RawBT background service (Zero dialog, silent print)
      const wsSuccess = await new Promise((resolve) => {
        let done = false;
        try {
          const ws = new WebSocket('ws://localhost:40213/');
          ws.onopen = () => {
            // RawBT WebSocket expects plain base64 string or JSON payload
            ws.send(base64);
            done = true;
            setTimeout(() => {
              try { ws.close(); } catch (_) {}
              resolve(true);
            }, 200);
          };
          ws.onerror = () => {
            if (!done) {
              done = true;
              resolve(false);
            }
          };
          setTimeout(() => {
            if (!done) {
              done = true;
              try { ws.close(); } catch (_) {}
              resolve(false);
            }
          }, 1200);
        } catch (_) {
          resolve(false);
        }
      });

      if (wsSuccess) {
        console.log('[PrintManager] Cetak berhasil terkirim via RawBT WebSocket background');
        return;
      }

      // Method 2: Android Intent URL Scheme (Opens RawBT direct print intent)
      console.log('[PrintManager] Mengalihkan ke Android Intent RawBT...');
      const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
      window.location.href = intentUrl;
    } catch (err) {
      console.error('[PrintManager] Gagal RawBT direct print, fallback ke browser print:', err);
      PrintManager.printBrowser();
    }
  }
};
