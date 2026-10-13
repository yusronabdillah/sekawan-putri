import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

export const exportService = {
  printReport: () => {
    window.print();
  },

  exportToCSV: (data, filename = 'laporan.csv') => {
    if (!data || data.length === 0) return;
    
    const csvString = Papa.unparse(data, {
      delimiter: ';', // Menggunakan titik koma untuk kompatibilitas Excel regional Indonesia
      quotes: true
    });
    
    // Add UTF-8 BOM for Excel compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });
    
    saveAs(blob, filename);
  },

  exportToExcel: async (data, filename = 'laporan.xlsx', options = {}) => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    const { title = 'Laporan', storeName = 'Sekawan Putri POS', period = '-', includeTotal = false } = options;

    const workbook = XLSX.utils.book_new();
    
    // Create header rows
    const headerRows = [
      [storeName],
      [title],
      [`Periode: ${period}`],
      [`Tgl Export: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`],
      []
    ];

    // Data keys
    const dataKeys = Object.keys(data[0]);
    headerRows.push(dataKeys); // Column Headers

    // Map data to AoA
    const dataRows = data.map(row => dataKeys.map(key => row[key]));
    
    // Add total row if requested
    if (includeTotal && data.length > 0) {
      const totalRow = dataKeys.map(key => {
        if (key.toLowerCase().includes('subtotal') || key.toLowerCase().includes('total') || key.toLowerCase().includes('harga') || key.toLowerCase().includes('nominal')) {
          return data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
        }
        if (key.toLowerCase() === 'qty' || key.toLowerCase() === 'stok') {
          return data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
        }
        return '';
      });
      totalRow[0] = 'TOTAL';
      dataRows.push(totalRow);
    }

    const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);

    // Format Rupiah (IDR) for numeric columns
    // In SheetJS, we can set z to format
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = 5; R <= range.e.r; ++R) { // Start from data row (header ends at row 5, wait: index 5 is data row 1)
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = {c: C, r: R};
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = worksheet[cellRef];
        if (!cell) continue;
        
        // If numeric and header implies currency
        const headerName = dataKeys[C]?.toLowerCase() || '';
        if (typeof cell.v === 'number' && (headerName.includes('harga') || headerName.includes('subtotal') || headerName.includes('total') || headerName.includes('nominal'))) {
          cell.z = '"Rp"#,##0';
        }
      }
    }

    // Auto-width columns
    const colWidths = dataKeys.map((key, colIndex) => {
      let maxLen = key.length;
      for (let r = 0; r < dataRows.length; r++) {
        const val = dataRows[r][colIndex];
        if (val) maxLen = Math.max(maxLen, String(val).length);
      }
      return { wch: maxLen + 2 };
    });
    worksheet['!cols'] = colWidths;
    
    // Freeze Panes (freeze up to row 6 which is headers)
    worksheet['!freeze'] = { xSplit: 0, ySplit: 6, topLeftCell: 'A7', activePane: 'bottomLeft', state: 'frozen' };
    
    // Auto Filter (on row 6)
    worksheet['!autofilter'] = { ref: `A6:${XLSX.utils.encode_col(dataKeys.length - 1)}6` };

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, filename);
  },

  exportToProfessionalPDF: async (data) => {
    console.log('Professional PDF Export will be implemented in v2');
    alert('Fitur Export PDF Profesional akan tersedia di update berikutnya.');
  }
};
