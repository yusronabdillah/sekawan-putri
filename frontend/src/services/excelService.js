import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const excelService = {
  exportProfessionalReport: async (data, filename = 'Laporan.xlsx') => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sekawan Putri POS';
      workbook.created = new Date();

      const { 
        summary, 
        transactions, 
        topProducts, 
        paymentMethods, 
        cashierPerformance, 
        periodLabel, 
        storeName, 
        exportUser 
      } = data;

      const dateStr = new Date().toLocaleDateString('id-ID');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // --- Helper Functions ---
      const addHeader = (sheet, title) => {
        sheet.mergeCells('A1:E1');
        sheet.getCell('A1').value = storeName || 'Sekawan Putri POS';
        sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF333333' } };
        sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

        sheet.mergeCells('A2:E2');
        sheet.getCell('A2').value = title;
        sheet.getCell('A2').font = { size: 14, bold: true };

        sheet.mergeCells('A3:E3');
        sheet.getCell('A3').value = `Periode: ${periodLabel}`;
        sheet.getCell('A3').font = { size: 11, italic: true };

        sheet.mergeCells('A4:E4');
        sheet.getCell('A4').value = `Diekspor pada: ${dateStr} ${timeStr} oleh ${exportUser || 'Admin'}`;
        sheet.getCell('A4').font = { size: 10, color: { argb: 'FF666666' } };

        sheet.addRow([]); // Blank row before table
      };

      const styleTable = (sheet, startRow, headers) => {
        // Add headers
        const headerRow = sheet.addRow(headers.map(h => h.label));
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Primary Color
          };
          cell.border = {
            top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
          };
        });

        // Auto Filter
        sheet.autoFilter = {
          from: { row: startRow, column: 1 },
          to: { row: startRow, column: headers.length }
        };

        // Freeze Header
        sheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: startRow }
        ];

        // Column widths and alignments
        headers.forEach((h, index) => {
          const col = sheet.getColumn(index + 1);
          col.width = h.width || 15;
          if (h.align) col.alignment = { horizontal: h.align };
          if (h.format) col.numFmt = h.format;
        });
      };

      const formatRupiah = '"Rp"#,##0';

      // ==========================================
      // SHEET 1: RINGKASAN
      // ==========================================
      const sheet1 = workbook.addWorksheet('Ringkasan');
      addHeader(sheet1, 'Ringkasan Laporan Bisnis');
      
      sheet1.addRow(['Pendapatan Global', summary.income || 0]).getCell(2).numFmt = formatRupiah;
      
      if (summary.parentIncomeByCategory) {
        Object.keys(summary.parentIncomeByCategory).forEach(parentCat => {
          // Tambahkan row untuk Kategori Induk
          const parentRow = sheet1.addRow([`Total Pendapatan ${parentCat}`, summary.parentIncomeByCategory[parentCat] || 0]);
          parentRow.getCell(2).numFmt = formatRupiah;
          parentRow.getCell(1).font = { bold: true };
          
          // Rincian sub kategori
          let subs = [];
          if (parentCat === 'Kategori A') subs = ['Frozen Food', 'Minuman', 'Sembako'];
          else if (parentCat === 'Kategori B') subs = ['Sayur', 'Ice Cream', 'Endog'];
          else subs = ['Lainnya'];
            
          subs.forEach(sub => {
            const subAmount = summary.incomeByCategory?.[sub] || 0;
            if (subAmount > 0 || (sub !== 'Lainnya' && summary.parentIncomeByCategory[parentCat] > 0)) {
              const row = sheet1.addRow([`  > ${sub}`, subAmount]);
              row.getCell(2).numFmt = formatRupiah;
              row.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
            }
          });
        });
      }

      sheet1.addRow(['Total Transaksi', summary.totalTx || 0]);
      sheet1.addRow(['Total Item Terjual', summary.totalItems || 0]);
      sheet1.addRow(['Laba Bersih Estimasi', summary.netProfit || 0]).getCell(2).numFmt = formatRupiah;
      sheet1.addRow(['Kas di Laci', summary.drawerCash || 0]).getCell(2).numFmt = formatRupiah;
      
      sheet1.getColumn(1).width = 30;
      sheet1.getColumn(1).font = { bold: true };
      sheet1.getColumn(2).width = 25;

      // ==========================================
      // SHEET 2: DETAIL TRANSAKSI
      // ==========================================
      const sheet2 = workbook.addWorksheet('Detail Transaksi');
      addHeader(sheet2, 'Detail Transaksi Penjualan');
      
      const txHeaders = [
        { label: 'Tgl', width: 12, align: 'center' },
        { label: 'Jam', width: 10, align: 'center' },
        { label: 'No Transaksi', width: 18 },
        { label: 'Pelanggan', width: 20 },
        { label: 'Kasir', width: 15 },
        { label: 'Produk', width: 25 },
        { label: 'Qty', width: 10, align: 'center', format: '#,##0' },
        { label: 'Harga', width: 15, align: 'right', format: formatRupiah },
        { label: 'Subtotal', width: 18, align: 'right', format: formatRupiah },
        { label: 'Metode', width: 15, align: 'center' },
        { label: 'Status', width: 15, align: 'center' }
      ];
      
      const txStartRow = 6;
      styleTable(sheet2, txStartRow, txHeaders);

      let totalQty = 0;
      let totalSubtotal = 0;
      let rowNum = txStartRow + 1;

      transactions.forEach((t, idx) => {
        const row = sheet2.addRow([
          t.Tgl, t.Jam, t['No Transaksi'], t.Pelanggan, t.Kasir, 
          t.Produk, t.Qty, t.Harga, t.Subtotal, t.Metode, t.Status
        ]);
        
        // Alternating colors
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FB' } }; // Light gray/blue
          });
        }
        
        // Alignments based on header config
        txHeaders.forEach((h, cIdx) => {
          if (h.align) row.getCell(cIdx + 1).alignment = { horizontal: h.align, vertical: 'middle' };
        });

        totalQty += (Number(t.Qty) || 0);
        totalSubtotal += (Number(t.Subtotal) || 0);
        rowNum++;
      });

      // GRAND TOTAL ROW
      const totalRow = sheet2.addRow(['GRAND TOTAL', '', '', '', '', '', totalQty, '', totalSubtotal, '', '']);
      totalRow.font = { bold: true };
      totalRow.eachCell({ includeEmpty: false }, cell => {
        cell.border = { top: { style: 'double' }, bottom: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }; // Secondary Light
      });
      // Merge cells for GRAND TOTAL text
      sheet2.mergeCells(`A${rowNum}:F${rowNum}`);
      sheet2.getCell(`A${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };


      // ==========================================
      // SHEET 3: PRODUK TERLARIS
      // ==========================================
      const sheet3 = workbook.addWorksheet('Produk Terlaris');
      addHeader(sheet3, 'Laporan Produk Terlaris');
      
      const pHeaders = [
        { label: 'No', width: 8, align: 'center' },
        { label: 'Nama Produk', width: 30 },
        { label: 'Qty Terjual', width: 15, align: 'center', format: '#,##0' },
        { label: 'Omset', width: 20, align: 'right', format: formatRupiah }
      ];
      
      styleTable(sheet3, 6, pHeaders);

      topProducts.forEach((p, idx) => {
        const row = sheet3.addRow([idx + 1, p.name, p.qty, p.revenue]);
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FB' } };
          });
        }
      });

      // ==========================================
      // SHEET 4: METODE PEMBAYARAN
      // ==========================================
      const sheet4 = workbook.addWorksheet('Metode Pembayaran');
      addHeader(sheet4, 'Analisis Metode Pembayaran');
      
      const mHeaders = [
        { label: 'Metode', width: 20 },
        { label: 'Jumlah Transaksi', width: 20, align: 'center', format: '#,##0' },
        { label: 'Total Nominal', width: 25, align: 'right', format: formatRupiah }
      ];
      
      styleTable(sheet4, 6, mHeaders);
      
      let sumTrx = 0;
      let sumNom = 0;
      let mRowNum = 7;
      
      paymentMethods.forEach((m, idx) => {
        const row = sheet4.addRow([m.method, m.count, m.total]);
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FB' } };
          });
        }
        sumTrx += (Number(m.count) || 0);
        sumNom += (Number(m.total) || 0);
        mRowNum++;
      });
      
      const mTotalRow = sheet4.addRow(['TOTAL', sumTrx, sumNom]);
      mTotalRow.font = { bold: true };
      mTotalRow.eachCell({ includeEmpty: false }, cell => {
        cell.border = { top: { style: 'double' }, bottom: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      });

      // ==========================================
      // SHEET 5: PERFORMA KASIR
      // ==========================================
      const sheet5 = workbook.addWorksheet('Performa Kasir');
      addHeader(sheet5, 'Analisis Performa Kasir');
      
      const cHeaders = [
        { label: 'Nama Kasir', width: 25 },
        { label: 'Jml Transaksi', width: 15, align: 'center', format: '#,##0' },
        { label: 'Item Terjual', width: 15, align: 'center', format: '#,##0' },
        { label: 'Total Penjualan', width: 25, align: 'right', format: formatRupiah }
      ];
      
      styleTable(sheet5, 6, cHeaders);
      
      cashierPerformance.forEach((c, idx) => {
        const row = sheet5.addRow([c.name, c.transactions, c.items, c.sales]);
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FB' } };
          });
        }
      });

      // Footer Header Configuration for printing (Excel Page Setup)
      workbook.eachSheet((worksheet) => {
        worksheet.headerFooter.oddFooter = `&L Diekspor oleh: ${exportUser || 'Admin'} &C &D &T &R Halaman &P dari &N`;
      });

      // Write to Buffer and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);

    } catch (error) {
      console.error("Excel Generation Error: ", error);
      throw error;
    }
  },

  exportRestockHistory: async (data, filename = 'Riwayat_Restock.xlsx') => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sekawan Putri POS';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Riwayat Restock');

      // Title
      sheet.mergeCells('A1:E1');
      sheet.getCell('A1').value = 'RIWAYAT RESTOCK (INBOUND)';
      sheet.getCell('A1').font = { size: 14, bold: true };
      
      const dateStr = new Date().toLocaleDateString('id-ID');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      sheet.mergeCells('A2:E2');
      sheet.getCell('A2').value = `Diekspor pada: ${dateStr} ${timeStr}`;
      sheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF666666' } };
      
      sheet.addRow([]);

      // Headers
      const headers = ['Tanggal', 'No. Referensi', 'Produk', 'Jumlah', 'Admin/Supplier'];
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Columns Width
      sheet.getColumn(1).width = 15; // Tanggal
      sheet.getColumn(2).width = 40; // No Ref
      sheet.getColumn(3).width = 45; // Produk
      sheet.getColumn(4).width = 15; // Jumlah
      sheet.getColumn(5).width = 25; // Admin/Supplier

      // Data
      if (data && data.length > 0) {
        data.forEach((item, idx) => {
          const tgl = item.in_date ? new Date(item.in_date).toLocaleDateString('id-ID') : 
                      (item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-');
          const row = sheet.addRow([
            tgl,
            item.reference_no || item.id || '-',
            item.product_name || '-',
            item.qty || 0,
            item.received_by || item.supplier || 'Admin'
          ]);
          
          if (idx % 2 === 1) {
            row.eachCell({ includeEmpty: true }, cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FB' } };
            });
          }
          
          row.eachCell((cell, colNumber) => {
            cell.border = { 
              top: { style: 'thin', color: {argb: 'FFCBD5E1'} }, 
              bottom: { style: 'thin', color: {argb: 'FFCBD5E1'} },
              left: { style: 'thin', color: {argb: 'FFCBD5E1'} },
              right: { style: 'thin', color: {argb: 'FFCBD5E1'} }
            };
            // Center align Tanggal and Jumlah
            if (colNumber === 1 || colNumber === 4) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
          });
        });
      } else {
        const emptyRow = sheet.addRow(['Tidak ada data riwayat restock', '', '', '', '']);
        sheet.mergeCells(`A${emptyRow.number}:E${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: 'center' };
      }

      // Write to Buffer and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);

    } catch (error) {
      console.error("Excel Generation Error: ", error);
      throw error;
    }
  }
};
