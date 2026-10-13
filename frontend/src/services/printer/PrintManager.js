export const PrintManager = {
  printReceipt: () => {
    // Cari elemen receipt yang akan dicetak
    const receiptElement = document.querySelector('.receipt-print-area');
    if (!receiptElement) {
      console.error('Elemen struk tidak ditemukan');
      return;
    }

    // Buat container khusus print jika belum ada
    let printContainer = document.getElementById('print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      document.body.appendChild(printContainer);
    }

    // Kosongkan container lalu masukkan clone dari receipt
    printContainer.innerHTML = '';
    const clone = receiptElement.cloneNode(true);
    printContainer.appendChild(clone);

    // Memberikan sedikit waktu untuk render clone
    setTimeout(() => {
      window.print();
      
      // Bersihkan container setelah dialog print tertutup (dengan setTimeout agar tidak hilang sebelum dicetak OS)
      setTimeout(() => {
        if (printContainer) {
          printContainer.innerHTML = '';
        }
      }, 1000);
    }, 100);
  }
};

