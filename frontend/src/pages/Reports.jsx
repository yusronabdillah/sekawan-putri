import React, { useState, useEffect } from 'react';
import { useReports } from '../hooks/useReports';
import TransactionDetailModal from '../components/TransactionDetailModal';
import Modal from '../components/Modal';
import OwnerAuthModal from '../components/OwnerAuthModal';
import { exportService } from '../services/exportService';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  Search, Download, Printer, Wifi, WifiOff, FileText, FileSpreadsheet, ChevronDown, BarChart2,
  Package, Trophy, Wallet, User, Plus, RefreshCw, Edit2
} from 'lucide-react';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore, useCategoryStore } from '../store/store';
import CustomSelect from '../components/CustomSelect';
import CurrencyInput from '../components/CurrencyInput';
import { syncService } from '../services/syncService';
import { apiClient } from '../services/apiClient';
import { PageHeader } from '../components/ui';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="animate-zoom-in" style={{
        backgroundColor: 'var(--surface)',
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{entry.name}:</span>
            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>Rp {Number(entry.value || 0).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const formatInvoiceNumber = (t) => {
  if (!t) return 'INV-???';
  const raw = t.invoice_number || t.invoiceNo || (typeof t === 'string' ? t : t.id) || '';
  if (!raw) return 'INV-???';
  if (raw.startsWith('INV-')) return raw;
  if (raw.startsWith('TEST-')) return raw;
  if (raw.includes('-')) {
    return `INV-${raw.split('-')[0].toUpperCase()}`;
  }
  return `INV-${raw.toUpperCase()}`;
};

export default function Reports() {
  const { user, token } = useAuthStore();
  const { categories, parentMapping = {} } = useCategoryStore();
  const [period, setPeriod] = useState('today');
  const [activeTab, setActiveTab] = useState('summary'); // summary, transactions, expenses, cashier, recap
  
  // Filters
  const [searchTx, setSearchTx] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // Tutup Kas MVP
  const [isTutupKasModalOpen, setIsTutupKasModalOpen] = useState(false);
  const [selectedTutupCategory, setSelectedTutupCategory] = useState('Semua');
  
  // Kas Awal
  const [isKasAwalModalOpen, setIsKasAwalModalOpen] = useState(false);
  const [kasAwalAmount, setKasAwalAmount] = useState('');
  
  // Expenses UI
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Gaji Karyawan', amount: '', notes: '' });
  
  // Slow Products UI
  const [slowThreshold, setSlowThreshold] = useState(5);
  const [isOwnerAuthResetOpen, setIsOwnerAuthResetOpen] = useState(false);

  const executeResetReports = async () => {
    try {
      if (window.navigator.onLine) {
        try {
          await apiClient.resetAllReports();
        } catch (cloudErr) {
          console.warn("Gagal menghapus sebagian data di cloud Firebase:", cloudErr);
        }
      }
      
      await db.transactions.clear();
      await db.transaction_items.clear();
      await db.cash_sessions.clear();
      await db.expenses.clear();
      if (db.stock_movements) {
        await db.stock_movements.clear();
      }
      if (db.sync_queue) {
        await db.sync_queue.clear();
      }
      
      try {
        await fetch('http://localhost:5000/api/transactions/reset-reports', {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
      } catch (e) {}

      alert("✓ Berhasil! Otorisasi Owner terverifikasi. Seluruh data laporan berhasil direset ke Rp 0.");
      window.location.reload();
    } catch (err) {
      alert("Gagal reset laporan: " + err.message);
    }
  };
  
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      alert("Masukkan nominal yang valid");
      return;
    }
    try {
      const newExpense = {
        id: `exp-${Date.now()}-${uuidv4().substring(0, 8)}`,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        notes: expenseForm.notes || '',
        created_at: new Date().toISOString(),
        cashier_id: user?.id || 'unknown'
      };
      await db.expenses.add(newExpense);
      await syncService.addToQueue('expenses', 'CREATE', newExpense);
      alert('Pengeluaran berhasil ditambahkan');
      setIsExpenseModalOpen(false);
      setExpenseForm({ category: 'Gaji Karyawan', amount: '', notes: '' });
      // Reload page to reflect new expense in useReports
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan pengeluaran');
    }
  };
  
  const { data, loading } = useReports(period);
  const { data: monthlyData } = useReports('this_month');
  const [selectedTx, setSelectedTx] = useState(null);

  // Sync status
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const prepareExportData = (type) => {
    let exportData = [];
    let filename = '';

    if (activeTab === 'transactions') {
      const txs = filteredTx || [];
      exportData = txs.map(t => ({
        'Invoice': t ? formatInvoiceNumber(t) : '-',
        'Tanggal': t?.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : '-',
        'Jam': t?.created_at ? new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Pelanggan': t?.customer_name || 'Umum',
        'Metode Pembayaran': t?.payment_method || '-',
        'Status': t?.status || '-',
        'Total': t?.total_amount || 0,
        'Kasir': t?.cashier_name || '-'
      }));
      filename = `laporan-transaksi-${new Date().toISOString().slice(0,10)}.${type}`;
    } else if (activeTab === 'expenses') {
      const exps = data?.expenses || [];
      exportData = exps.map(e => ({
        'Tanggal': e?.created_at ? new Date(e.created_at).toLocaleDateString('id-ID') : '-',
        'Jam': e?.created_at ? new Date(e.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Kategori': e?.category || '-',
        'Keterangan': e?.notes || '-',
        'Nominal': e?.amount || 0
      }));
      filename = `laporan-pengeluaran-${new Date().toISOString().slice(0,10)}.${type}`;
    }

    return { exportData, filename };
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const txs = filteredTx || [];
      const detailedData = [];
      
      txs.forEach(tx => {
        const invoice = formatInvoiceNumber(tx);
        const date = new Date(tx.created_at).toLocaleDateString('id-ID');
        const time = new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        if (!tx.items || tx.items.length === 0) {
          detailedData.push({
            'Tgl': date, 'Jam': time, 'No Transaksi': invoice, 'Pelanggan': tx.customer_name || 'Umum',
            'Kasir': tx.cashier_name || '-', 'Produk': '-', 'Qty': 0, 'Harga': 0, 'Subtotal': tx.total_amount,
            'Metode': tx.payment_method || '-', 'Status': tx.status || '-'
          });
        } else {
          tx.items.forEach((item, i) => {
            detailedData.push({
              'Tgl': i === 0 ? date : '', 'Jam': i === 0 ? time : '', 'No Transaksi': i === 0 ? invoice : '',
              'Pelanggan': i === 0 ? (tx.customer_name || 'Umum') : '', 'Kasir': i === 0 ? (tx.cashier_name || '-') : '',
              'Produk': item.product_name || '-', 'Qty': item.qty, 'Harga': item.price, 'Subtotal': item.subtotal,
              'Metode': i === 0 ? (tx.payment_method || '-') : '', 'Status': i === 0 ? (tx.status || '-') : ''
            });
          });
        }
      });

      if (detailedData.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
      }
      exportService.exportToCSV(detailedData, `laporan-transaksi-${new Date().toISOString().slice(0,10)}.csv`);
      setIsExportOpen(false);
    } catch (err) {
      alert("Gagal mengekspor: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const txs = filteredTx || [];
      if (txs.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
      }

      const detailedTransactions = [];
      const productMap = {};
      const methodMap = {};

      txs.forEach(tx => {
        const invoice = formatInvoiceNumber(tx);
        const date = new Date(tx.created_at).toLocaleDateString('id-ID');
        const time = new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        // Count Method
        if (tx.status === 'COMPLETED') {
          const m = tx.payment_method || 'CASH';
          if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 };
          methodMap[m].count += 1;
          methodMap[m].total += tx.total_amount;
        }

        if (!tx.items || tx.items.length === 0) {
          detailedTransactions.push({
            'Tgl': date, 'Jam': time, 'No Transaksi': invoice, 'Pelanggan': tx.customer_name || 'Umum',
            'Kasir': tx.cashier_name || '-', 'Produk': '-', 'Qty': 0, 'Harga': 0, 'Subtotal': tx.total_amount,
            'Metode': tx.payment_method || '-', 'Status': tx.status || '-'
          });
        } else {
          tx.items.forEach((item, i) => {
            detailedTransactions.push({
              'Tgl': i === 0 ? date : '', 'Jam': i === 0 ? time : '', 'No Transaksi': i === 0 ? invoice : '',
              'Pelanggan': i === 0 ? (tx.customer_name || 'Umum') : '', 'Kasir': i === 0 ? (tx.cashier_name || '-') : '',
              'Produk': item.product_name || '-', 'Qty': item.qty, 'Harga': item.price, 'Subtotal': item.subtotal,
              'Metode': i === 0 ? (tx.payment_method || '-') : '', 'Status': i === 0 ? (tx.status || '-') : ''
            });

            if (tx.status === 'COMPLETED') {
              const pName = item.product_name || '-';
              if (!productMap[pName]) productMap[pName] = { qty: 0, revenue: 0 };
              productMap[pName].qty += item.qty;
              productMap[pName].revenue += item.subtotal;
            }
          });
        }
      });

      const topProducts = Object.keys(productMap).map(k => ({
        name: k, qty: productMap[k].qty, revenue: productMap[k].revenue
      })).sort((a,b) => b.qty - a.qty);

      const paymentMethods = Object.keys(methodMap).map(k => ({
        method: k, count: methodMap[k].count, total: methodMap[k].total
      })).sort((a,b) => b.total - a.total);

      const cashierPerformance = (data.cashierAnalysis || []).map(c => ({
        name: c.cashier_name,
        transactions: c.total_tx,
        items: c.total_items,
        sales: c.total_sales
      }));

      // Dynamically import excelService to avoid breaking old exports
      const { excelService: advancedExcelService } = await import('../services/excelService');
      
      await advancedExcelService.exportProfessionalReport({
        summary: data.summary,
        transactions: detailedTransactions,
        topProducts,
        paymentMethods,
        cashierPerformance,
        periodLabel: data.periodLabel || period,
        storeName: 'Sekawan Putri POS',
        exportUser: user?.name || user?.username || 'Kasir'
      }, `Laporan-Bisnis-${new Date().toISOString().slice(0,10)}.xlsx`);

      setIsExportOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal mengekspor: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRestock = async (restocksData) => {
    setIsExporting(true);
    try {
      if (!restocksData || restocksData.length === 0) {
        alert("Tidak ada data riwayat restock untuk diexport");
        return;
      }
      const { excelService: advancedExcelService } = await import('../services/excelService');
      await advancedExcelService.exportRestockHistory(restocksData, `Riwayat-Restock-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengekspor riwayat restock: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };



  const safeTransactions = data?.transactions || [];
  const filteredTx = safeTransactions.filter(t => {
    const tId = t?.id || '';
    const tCashier = t?.cashier_name || '';
    const tCustomer = t?.customer_name || '';
    
    const matchSearch = tId.toLowerCase().includes(searchTx.toLowerCase()) ||
                        formatInvoiceNumber(t).toLowerCase().includes(searchTx.toLowerCase()) ||
                        tCashier.toLowerCase().includes(searchTx.toLowerCase()) ||
                        tCustomer.toLowerCase().includes(searchTx.toLowerCase());
    const matchMethod = filterMethod ? t.payment_method === filterMethod : true;
    return matchSearch && matchMethod;
  });

  const TransactionRow = ({ index, style }) => {
    const tx = filteredTx[index];
    if (!tx) return null;

    const tId = tx?.id || '';
    const dateStr = tx?.created_at ? new Date(tx.created_at).toLocaleString('id-ID') : '-';
    const totalAmount = tx?.total_amount || 0;

    return (
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          padding: '16px',
          cursor: 'pointer',
          backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--background)',
          gap: '16px',
          flexWrap: 'wrap'
        }}
        onClick={() => setSelectedTx(tx)}
        className="hover-row"
      >
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{formatInvoiceNumber(tx)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dateStr}</div>
          <div style={{ fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} color="var(--text-muted)"/> {tx.customer_name || 'Umum'} 
            <span style={{ color: 'var(--border)' }}>|</span> 
            <span style={{ color: 'var(--text-muted)' }}>Kasir: {tx.cashier_name || '-'}</span>
          </div>
        </div>
        
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{tx.payment_method || '-'}</span>
            <span className="badge" style={{ 
              backgroundColor: tx.status === 'COMPLETED' ? 'var(--secondary-light)' : (tx.status === 'VOID' ? 'var(--danger-light)' : 'var(--warning-light)'),
              color: tx.status === 'COMPLETED' ? 'var(--secondary)' : (tx.status === 'VOID' ? 'var(--danger)' : 'var(--warning)'),
              fontSize: '11px',
              padding: '4px 8px',
            }}>
              {tx.status || '-'}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>
            Rp {(totalAmount || 0).toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    );
  };

  const handleTutupKas = async () => {
    let unclosed = 0;
    if (selectedTutupCategory === 'Semua') {
      unclosed = Object.values(data.summary.unclosedParentIncomeByCategory || {}).reduce((a, b) => a + b, 0);
    } else {
      unclosed = data.summary.unclosedParentIncomeByCategory?.[selectedTutupCategory] || 0;
    }
    
    if (unclosed <= 0 && selectedTutupCategory !== 'Semua') {
      alert(`Kategori ${selectedTutupCategory} sudah ditutup dan belum ada transaksi baru.`);
      return;
    }
    
    if (selectedTutupCategory === 'Semua' && unclosed <= 0) {
      if (!window.confirm("Belum ada transaksi baru untuk ditutup. Tetap lakukan tutup kas?")) return;
    }

    const session = {
      id: uuidv4(),
      cashier_id: user.id,
      opened_at: new Date(new Date().setHours(0,0,0,0)).toISOString(),
      closed_at: new Date().toISOString(),
      closed_category: selectedTutupCategory,
      starting_cash: selectedTutupCategory === 'Semua' ? data.recap.startingCash : 0,
      cash_in: selectedTutupCategory === 'Semua' ? data.recap.cashIn : 0,
      qris_in: selectedTutupCategory === 'Semua' ? data.recap.qrisIn : 0,
      transfer_in: selectedTutupCategory === 'Semua' ? data.recap.transferIn : 0,
      cash_out: selectedTutupCategory === 'Semua' ? data.recap.cashOut : 0,
      cash_refund: selectedTutupCategory === 'Semua' ? data.recap.cashRefund : 0,
      expected_cash: selectedTutupCategory === 'Semua' ? data.recap.drawerCash : unclosed,
      actual_cash: selectedTutupCategory === 'Semua' ? data.recap.drawerCash : unclosed,
      omzet: unclosed,
      variance: 0,
      net_profit: selectedTutupCategory === 'Semua' ? (data.summary.unclosedNetProfit || 0) : (data.summary.unclosedNetProfitByCategory?.[selectedTutupCategory] || 0),
      category_breakdown: selectedTutupCategory === 'Semua' ? { ...data.summary.unclosedParentIncomeByCategory } : { [selectedTutupCategory]: unclosed },
      profit_breakdown: selectedTutupCategory === 'Semua' ? { ...data.summary.unclosedNetProfitByCategory } : { [selectedTutupCategory]: (data.summary.unclosedNetProfitByCategory?.[selectedTutupCategory] || 0) },
      notes: `Tutup kas kategori: ${selectedTutupCategory}`
    };
    
    await db.cash_sessions.add(session);
    await db.sync_queue.add({
      id: crypto.randomUUID ? crypto.randomUUID() : `sq-${Date.now()}`,
      type: 'SYNC',
      entity: 'cash_sessions',
      action: 'CREATE',
      payload: session,
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
    alert("Berhasil tutup kas!");
    setIsTutupKasModalOpen(false);
    window.location.reload();
  };

  const handleSaveKasAwal = async () => {
    const amount = parseInt(kasAwalAmount) || 0;
    const session = {
      id: uuidv4(),
      cashier_id: user.id,
      opened_at: new Date().toISOString(),
      starting_cash: amount,
      notes: 'Buka Kas (Manual)'
    };
    
    await db.cash_sessions.add(session);
    await db.sync_queue.add({
      id: crypto.randomUUID ? crypto.randomUUID() : `sq-${Date.now()}`,
      type: 'SYNC',
      entity: 'cash_sessions',
      action: 'CREATE',
      payload: session,
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
    alert("Kas Awal berhasil disimpan!");
    setIsKasAwalModalOpen(false);
    setKasAwalAmount('');
    window.location.reload();
  };

  return (
    <div className="page-transition">
      
      {/* Header */}
      <PageHeader
        title="Laporan"
        icon={BarChart2}
        badges={
          isOnline ? (
            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '100px' }}><Wifi size={14} style={{marginRight: '4px'}}/> Tersinkron</span>
          ) : (
            <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '100px' }}><WifiOff size={14} style={{marginRight: '4px'}}/> Offline</span>
          )
        }
        subtitle={<>Periode: <strong style={{ color: 'var(--text-main)' }}>{data.periodLabel}</strong></>}
        actions={
          <CustomSelect
            value={period} 
            onChange={setPeriod} 
            options={[
              { value: 'today', label: 'Hari Ini' },
              { value: 'yesterday', label: 'Kemarin' },
              { value: 'this_week', label: 'Minggu Ini' },
              { value: 'this_month', label: 'Bulan Ini' },
              { value: 'all_time', label: 'Semua Waktu' }
            ]}
            placeholder="Pilih Periode"
            minWidth="200px"
          />
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
            <div>Memuat data laporan...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('summary')} style={{ whiteSpace: 'nowrap' }}>Ringkasan</button>
            <button className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('transactions')} style={{ whiteSpace: 'nowrap' }}>Transaksi</button>
            <button className={`btn ${activeTab === 'cashier' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('cashier')} style={{ whiteSpace: 'nowrap' }}>Analisis Kasir</button>
            <button className={`btn ${activeTab === 'recap' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('recap')} style={{ whiteSpace: 'nowrap' }}>Rekap Kas</button>
            <button className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('expenses')} style={{ whiteSpace: 'nowrap' }}>Pengeluaran</button>
            <button className={`btn ${activeTab === 'warehouse' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('warehouse')} style={{ whiteSpace: 'nowrap' }}>Aktivitas Gudang</button>
            <button className={`btn ${activeTab === 'slow_products' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('slow_products')} style={{ whiteSpace: 'nowrap' }}>Produk Kurang Laku</button>
          </div>

          {activeTab === 'summary' && (
            <div>
              {/* Row 1: Financial Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--secondary)' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--secondary-light)', borderRadius: '50%', color: 'var(--secondary)' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>UANG MASUK</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>Rp {(data?.summary?.income || 0).toLocaleString('id-ID')}</div>
                    {data?.summary?.parentIncomeByCategory && Object.keys(data.summary.parentIncomeByCategory).length > 0 ? (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(data.summary.parentIncomeByCategory).map(([parentCat, pAmount]) => {
                          const subs = parentCat === 'Lainnya' ? ['Lainnya'] : categories.filter(c => (parentMapping[c] || 'Kategori A') === parentCat);
                          return (
                            <div key={parentCat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{parentCat}</span>
                                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Rp {(pAmount || 0).toLocaleString('id-ID')}</span>
                              </div>
                              {subs.map(sub => {
                                const sAmount = data.summary.incomeByCategory?.[sub] || 0;
                                if (sAmount > 0 || (sub !== 'Lainnya' && pAmount > 0)) {
                                  return (
                                    <div key={sub} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingLeft: '8px' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>- {sub}</span>
                                      <span style={{ color: 'var(--text-muted)' }}>Rp {(sAmount || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada pemasukan</div>
                    )}
                  </div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--danger)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'var(--danger-light)', borderRadius: '50%', color: 'var(--danger)' }}>
                      <TrendingDown size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>UANG KELUAR</div>
                      <div style={{ fontSize: '20px', fontWeight: '700' }}>Rp {(data?.summary?.expense || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                  {data?.expenses && data.expenses.length > 0 ? (
                    <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(
                        data.expenses.reduce((acc, exp) => {
                          const cat = exp.category || 'Lainnya';
                          acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
                          return acc;
                        }, {})
                      ).map(([cat, amount]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{cat}</span>
                          <span style={{ fontWeight: '500' }}>Rp {amount.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada pengeluaran</div>
                  )}
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ padding: '12px', backgroundColor: '#ede9fe', borderRadius: '50%', color: '#8b5cf6' }}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL TRANSAKSI</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{data?.summary?.totalTx || 0} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Transaksi</span></div>
                    {(!data?.summary?.totalTx || data.summary.totalTx === 0) && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada transaksi</div>
                    )}
                  </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary)' }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>LABA BERSIH</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>Rp {(data?.summary?.netProfit || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>

              {/* Row 2: Operational Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '50%', color: '#3b82f6' }}>
                    <Package size={24} />
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>KEMASAN (PCS)</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{Number(data?.summary?.totalItems || 0).toLocaleString('id-ID')} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Pcs</span></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>SAYUR (KG)</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{Number(data?.summary?.totalItemsSayur || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Kg</span></div>
                      </div>
                    </div>
                    {(!data?.summary?.totalItems && !data?.summary?.totalItemsSayur) && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada item terjual</div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ padding: '12px', backgroundColor: '#ede9fe', borderRadius: '50%', color: '#8b5cf6' }}>
                    <BarChart2 size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>RATA-RATA TRANSAKSI</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>Rp {Math.round(data?.summary?.avgTx || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '50%', color: '#f59e0b' }}>
                    <Trophy size={24} />
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>PRODUK TERLARIS</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data?.summary?.topProduct || '-'}</div>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #ea580c' }}>
                  <div style={{ padding: '12px', backgroundColor: '#ffedd5', borderRadius: '50%', color: '#ea580c' }}>
                    <Wallet size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>KAS DI LACI</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>Rp {(data?.summary?.drawerCash || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Grafik Performa Penjualan</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.chartData || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.15} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp ${(val || 0).toLocaleString('id-ID')}`} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} width={90} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500', paddingBottom: '8px' }} />
                      
                      <Area type="monotone" dataKey="income" name="Pemasukan" stroke="var(--secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--secondary)' }} dot={false} animationDuration={700} />
                      <Area type="monotone" dataKey="profit" name="Profit" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }} dot={false} animationDuration={700} />
                      <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="var(--danger)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--danger)' }} dot={false} animationDuration={700} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="card" style={{ padding: '0', overflow: 'visible' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 style={{ margin: 0 }}>Riwayat Transaksi</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '800px' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div className="search-bar" style={{ flex: '7 1 200px', margin: 0, padding: '8px 12px' }}>
                          <Search size={16} />
                        <input 
                          type="text" 
                          placeholder="Cari Invoice/Pelanggan..." 
                          value={searchTx}
                          onChange={e => setSearchTx(e.target.value)}
                          style={{ fontSize: '14px' }}
                        />
                      </div>
                      <div style={{ flex: '3 1 120px' }}>
                        <CustomSelect 
                          value={filterMethod} 
                          onChange={setFilterMethod} 
                          options={[
                            { value: '', label: 'Semua Metode' },
                            { value: 'CASH', label: 'Tunai' },
                            { value: 'QRIS', label: 'QRIS' },
                            { value: 'TRANSFER', label: 'Transfer' }
                          ]}
                          placeholder="Semua Metode"
                          minWidth="100%"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive List Wrapper */}
              <div style={{ width: '100%' }}>
                  {filteredTx.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Tidak ada transaksi ditemukan</div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      {filteredTx.slice(0, 100).map((tx, index) => (
                        <TransactionRow key={tx?.id || index} index={index} />
                      ))}
                      {filteredTx.length > 100 && (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                          Menampilkan 100 dari {filteredTx.length} transaksi. Gunakan filter untuk mencari.
                        </div>
                      )}
                    </div>
                  )}
              </div>
              </div>
            </div>
          )}

          {activeTab === 'cashier' && (
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Analisis Kasir</h3>
              <div style={{ width: '100%' }}>
                {(data?.cashierAnalysis || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada aktivitas kasir</div>
                ) : (
                  <div style={{ width: '100%' }}>
                    {(data?.cashierAnalysis || []).map((c, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--background)',
                        gap: '16px'
                      }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={16} color="var(--primary)" /> {c?.cashier_name || '-'}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{c?.total_tx || 0}</span> Transaksi 
                            <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span> 
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{Number(c?.total_items || 0).toLocaleString('id-ID')}</span> Pcs
                            <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span> 
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{Number(c?.total_items_sayur || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span> Kg Sayur
                          </div>
                        </div>
                        
                        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Total Penjualan</div>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary)' }}>
                            Rp {(c?.total_sales || 0).toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Rata-rata: Rp {Math.round(c?.avg_tx || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* RESET BUTTON */}
              <div style={{ padding: '0', display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button 
                  onClick={() => setIsOwnerAuthResetOpen(true)}
                  style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  title="Reset Data Laporan (Otorisasi Owner)"
                >
                  <RefreshCw size={18} />
                  <span>Reset Seluruh Data Laporan & Transaksi ke Rp 0 (Otorisasi Owner)</span>
                </button>
              </div>

              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '24px' }}>Rekap Kas Harian</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Kas Awal</span>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          setKasAwalAmount(data?.recap?.startingCash || '');
                          setIsKasAwalModalOpen(true);
                        }}
                      >
                        <Edit2 size={10} /> Ubah
                      </button>
                    </div>
                    <span style={{ fontWeight: '600', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.startingCash || 0).toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div style={{ borderTop: '1px dashed var(--border)', margin: '4px 0' }}></div>

                  {data?.summary?.parentIncomeByCategory && Object.keys(data.summary.parentIncomeByCategory).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rincian Kategori & Status:</div>
                      {Object.entries(data.summary.parentIncomeByCategory).map(([parentCat, pAmount]) => {
                        const subs = parentCat === 'Lainnya' ? ['Lainnya'] : categories.filter(c => (parentMapping[c] || 'Kategori A') === parentCat);
                        
                        const unclosed = data.summary.unclosedParentIncomeByCategory?.[parentCat] || 0;
                        const isClosed = unclosed === 0;
                        const catTimeStr = data.summary.lastClosedByTime?.[parentCat];
                        const semuaTimeStr = data.summary.lastClosedByTime?.['Semua'];
                        const catTime = catTimeStr ? new Date(catTimeStr).getTime() : 0;
                        const semuaTime = semuaTimeStr ? new Date(semuaTimeStr).getTime() : 0;
                        const lastTime = catTime > semuaTime ? catTimeStr : semuaTimeStr;

                        return (
                          <div key={parentCat} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: '700' }}>{parentCat}</span>
                              <span style={{ fontWeight: '700', color: 'var(--text-main)', textAlign: 'right', flexShrink: 0 }}>Rp {(pAmount || 0).toLocaleString('id-ID')}</span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
                              {isClosed && lastTime ? (
                                <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>✅ Sudah Ditutup ({new Date(lastTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})</span>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '600' }}>⏳ Belum Ditutup</span>
                              )}
                            </div>
                            
                            {subs.map(cat => {
                              const amount = data.summary.incomeByCategory?.[cat] || 0;
                              if (amount === 0 && pAmount === 0 && cat !== 'Lainnya') return null; // hide empty if parent is empty
                              if (amount === 0 && cat === 'Lainnya') return null;
                              
                              return (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '8px', marginBottom: '2px' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>- {cat}</span>
                                  <span style={{ fontWeight: '500', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>Rp {(amount || 0).toLocaleString('id-ID')}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>(+) Penjualan Tunai</span>
                      <span style={{ fontWeight: '600', color: 'var(--secondary)', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.cashIn || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>(+) Penjualan QRIS</span>
                      <span style={{ fontWeight: '600', color: 'var(--secondary)', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.qrisIn || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>(+) Penjualan Transfer</span>
                      <span style={{ fontWeight: '600', color: 'var(--secondary)', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.transferIn || 0).toLocaleString('id-ID')}</span>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>(-) Pengeluaran Tunai</span>
                      <span style={{ fontWeight: '600', color: 'var(--danger)', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.cashOut || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>(-) Refund Tunai</span>
                      <span style={{ fontWeight: '600', color: 'var(--warning)', textAlign: 'right', flexShrink: 0 }}>Rp {(data?.recap?.cashRefund || 0).toLocaleString('id-ID')}</span>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Estimasi Kas di Laci</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(Sesi Saat Ini)</span>
                      </div>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--warning)', textAlign: 'right', flexShrink: 0, wordBreak: 'break-all' }}>
                        Rp {(data?.recap?.drawerCash || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>Total Keseluruhan Hari Ini</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Omzet / Penjualan</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Rp {(data?.summary?.income || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Modal (HPP)</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>- Rp {((data?.summary?.income || 0) - (data?.summary?.grossProfit || 0)).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ borderTop: '1px dashed var(--border)', margin: '4px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Laba Kotor</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--secondary)' }}>Rp {(data?.summary?.grossProfit || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pengeluaran (Operasional)</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>- Rp {(data?.summary?.expense || 0).toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div style={{ borderTop: '2px solid var(--primary-light)', margin: '8px 0' }}></div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>Laba Bersih</span>
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', textAlign: 'right', flexShrink: 0 }}>
                          Rp {(data?.summary?.netProfit || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
                  <button className="btn btn-primary btn-block" style={{ minHeight: '56px', fontSize: '16px', fontWeight: '700', borderRadius: '16px' }} onClick={() => setIsTutupKasModalOpen(true)}>
                    Tutup Kas Sekarang
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '24px' }}>Riwayat Tutup Kas</h3>
                {(data?.cashSessions || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Belum ada riwayat tutup kas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[...(data?.cashSessions || [])]
                      .filter(s => s.closed_at)
                      .sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime())
                      .slice(0, 5)
                      .map(s => (
                      <div key={s?.id || Math.random()} style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s?.closed_at ? new Date(s.closed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                          </span>
                          <span className="badge" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', flexShrink: 0, padding: '4px 8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kasir:</span> 
                            <span>{s?.cashier_id ? s.cashier_id.substring(0, 6) : '-'}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                            <span style={{ color: 'var(--text-muted)' }}>Kat:</span> 
                            <span style={{ fontWeight: '600' }}>{s?.closed_category || 'Semua'}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pendapatan (Omzet):</span>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>Rp {((s?.omzet !== undefined ? s.omzet : (s?.expected_cash || 0))).toLocaleString('id-ID')}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Kas Tersimpan (Laci):</span>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-muted)' }}>Rp {(s?.actual_cash || 0).toLocaleString('id-ID')}</span>
                          </div>

                          {(s?.net_profit !== undefined && s?.net_profit > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Laba Bersih:</span>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--primary)' }}>Rp {(s.net_profit).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                        
                        {s?.category_breakdown && Object.keys(s.category_breakdown).length > 0 && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Rincian Pendapatan:</div>
                            {Object.entries(s.category_breakdown).map(([catName, amt]) => {
                              const profitAmt = s.profit_breakdown ? (s.profit_breakdown[catName] || 0) : 0;
                              return (
                                <div key={catName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', marginBottom: '8px' }}>
                                  <span style={{ color: 'var(--text-main)', marginTop: '2px' }}>- {catName}</span>
                                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '600' }}>Omzet: Rp {(amt || 0).toLocaleString('id-ID')}</span>
                                    {profitAmt > 0 && <span style={{ fontWeight: '500', color: 'var(--primary)', fontSize: '11px' }}>Laba: Rp {profitAmt.toLocaleString('id-ID')}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="card">
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Daftar Pengeluaran</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setIsExpenseModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', minHeight: '38px', borderRadius: '24px' }}
                  >
                    <Plus size={18} /> Pengeluaran
                  </button>
                </div>
              </div>
              <div style={{ width: '100%' }}>
                {(data?.expenses || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada pengeluaran</div>
                ) : (
                  <div style={{ width: '100%' }}>
                    {(data?.expenses || []).map((exp, i) => (
                      <div key={exp?.id || Math.random()} style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--background)',
                        gap: '16px'
                      }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-main)' }}>
                            {exp?.category || '-'}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {exp?.notes || 'Tidak ada catatan'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            {exp?.created_at ? new Date(exp.created_at).toLocaleString('id-ID') : '-'}
                          </div>
                        </div>
                        
                        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--danger)' }}>
                            - Rp {(exp?.amount || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'warehouse' && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Log Aktivitas Gudang (Audit Trail)</h3>
              </div>
              <div style={{ width: '100%' }}>
                {(data?.warehouseLogs?.auditLogs || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada log aktivitas gudang</div>
                ) : (
                  <div style={{ width: '100%' }}>
                    {(data?.warehouseLogs?.auditLogs || []).map((log, i) => {
                      const d = new Date(log.created_at);
                      const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                      const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={log.id} style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--background)',
                          gap: '16px'
                        }}>
                          <div style={{ flex: '1 1 200px' }}>
                            <div style={{ fontWeight: '600', fontSize: '15px' }}>{log.product_name || '-'}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{log.details || '-'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={12} /> {log.user_name || '-'} 
                              <span style={{ color: 'var(--border)' }}>|</span> 
                              {tgl} {jam}
                            </div>
                          </div>
                          <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                            <span className="badge badge-primary">
                              {{
                                'APPROVE_RESTOCK': 'Restock Disetujui',
                                'REJECT_RESTOCK': 'Restock Ditolak',
                                'APPROVE_RECEIVE_GOODS': 'Barang Masuk Disetujui',
                                'REJECT_RECEIVE_GOODS': 'Barang Masuk Ditolak',
                                'FEFO_DEDUCTION': 'Stok Berkurang (Penj)',
                                'CREATE_RESTOCK': 'Permintaan Restock Dibuat',
                                'RECEIVE_GOODS': 'Barang Masuk Dicatat',
                                'STOCK_ADJUSTMENT': 'Penyesuaian Stok',
                                'UPDATE_PRODUCT': 'Produk Diperbarui',
                                'CREATE_PRODUCT': 'Produk Baru Ditambahkan'
                              }[log.action] || log.action.replace(/_/g, ' ')}
                            </span>
                            {log.user_role && (
                               <div style={{ marginTop: '8px' }}>
                                 <span style={{ 
                                   padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                                   backgroundColor: log.user_role === 'OWNER' ? 'var(--primary-light)' : (log.user_role === 'GUDANG' ? 'var(--secondary-light)' : 'var(--background)'),
                                   color: log.user_role === 'OWNER' ? 'var(--primary)' : (log.user_role === 'GUDANG' ? 'var(--secondary)' : 'var(--text-main)')
                                 }}>
                                   {log.user_role}
                                 </span>
                               </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '40px 0 24px 0' }}>
                <h3 style={{ margin: 0 }}>Riwayat Restock</h3>
                <button 
                  className="btn btn-outline"
                  onClick={() => handleExportRestock(data?.warehouseLogs?.restocks || [])}
                  disabled={isExporting}
                >
                  {isExporting ? <RefreshCw size={16} className="animate-spin" style={{ marginRight: '8px' }} /> : <Download size={16} style={{ marginRight: '8px' }} />}
                  Export Excel
                </button>
              </div>
              <div style={{ width: '100%' }}>
                {(data?.warehouseLogs?.restocks || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Belum ada riwayat restock</div>
                ) : (
                  <div style={{ width: '100%' }}>
                    {(data?.warehouseLogs?.restocks || []).map((req, i) => (
                      <div key={req.id} style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--background)',
                        gap: '16px'
                      }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontWeight: '600', fontSize: '15px' }}>{req.product_name || '-'}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                            <span>Qty: <strong>{req.qty}</strong></span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span>Pemohon: {req.created_by_name || '-'}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            {new Date(req.created_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span className={`badge ${req.status === 'Approved' ? 'badge-success' : req.status === 'Pending Approval' ? 'badge-warning' : 'badge-danger'}`}>
                            {req.status}
                          </span>
                          {req.priority && (
                            <span style={{ fontSize: '12px', fontWeight: '600', color: req.priority === 'Tinggi' ? 'var(--danger)' : 'var(--text-muted)' }}>
                              Prioritas: {req.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'slow_products' && (
            <div className="card">
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}>Produk Kurang Laku (Per Bulan)</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                    Informasi produk dengan tingkat penjualan kurang dari patokan <strong>selama bulan ini</strong>.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>Batas Penjualan:</label>
                  <CustomSelect 
                    value={slowThreshold.toString()}
                    onChange={(val) => setSlowThreshold(Number(val))}
                    options={[
                      { value: '5', label: 'Kurang dari 5 item' },
                      { value: '10', label: 'Kurang dari 10 item' },
                      { value: '20', label: 'Kurang dari 20 item' },
                      { value: '50', label: 'Kurang dari 50 item' }
                    ]}
                    minWidth="180px"
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
                      <th style={{ padding: '12px 8px' }}>Nama Produk</th>
                      <th style={{ padding: '12px 8px' }}>Kategori</th>
                      <th style={{ padding: '12px 8px' }}>Stok Saat Ini</th>
                      <th style={{ padding: '12px 8px' }}>Terjual (Periode Ini)</th>
                      <th style={{ padding: '12px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const slowList = (monthlyData?.allProducts || []).map(p => {
                        const soldQty = monthlyData?.productCounts?.[p.name] || 0;
                        return { ...p, soldQty };
                      }).filter(p => p.soldQty < slowThreshold).sort((a,b) => a.soldQty - b.soldQty);
                      
                      if (slowList.length === 0) {
                        return <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Tidak ada produk yang kurang laku (Semua terjual &ge; {slowThreshold} item).</td></tr>;
                      }
                      
                      return slowList.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--background)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: '500' }}>{p.name}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-muted)' }}>{p.category}</td>
                          <td style={{ padding: '12px 8px', fontWeight: '600' }}>{p.stock} {p.unit || 'Pcs'}</td>
                          <td style={{ padding: '12px 8px', color: p.soldQty === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: '600' }}>
                            {p.soldQty} Item
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className="badge badge-danger">Kurang Laku</span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}

      {/* Detail Modal */}
      <TransactionDetailModal 
        isOpen={!!selectedTx} 
        onClose={() => setSelectedTx(null)} 
        tx={selectedTx} 
      />

      {/* Tutup Kas Category Modal */}
      <Modal 
        isOpen={isTutupKasModalOpen} 
        onClose={() => setIsTutupKasModalOpen(false)} 
        title="Tutup Kas"
        contentStyle={{ overflow: 'visible' }}
      >
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
          Anda akan menutup kas untuk mengunci transaksi hari ini. Kas yang ditutup akan direset ke saldo awal untuk sesi berikutnya.
        </p>
        
        <div style={{ marginBottom: '24px' }}>
          <label className="form-label">Tutup Kas Untuk Kategori:</label>
          <CustomSelect 
            value={selectedTutupCategory} 
            onChange={setSelectedTutupCategory}
            options={[
              { value: 'Semua', label: 'Semua Kategori (Global)' },
              ...Object.keys(data?.summary?.parentIncomeByCategory || {}).map(cat => ({ value: cat, label: cat }))
            ]}
          />
        </div>
        <div style={{ padding: '12px', backgroundColor: 'var(--warning-light)', borderRadius: '8px', color: 'var(--warning-hover)', fontSize: '13px', marginBottom: '24px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Perhatian:</div>
          Tindakan ini akan mencatat omset saat ini sebagai kas masuk dan mengunci laporan untuk shift/hari ini sesuai kategori yang dipilih.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => setIsTutupKasModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleTutupKas}>Tutup Kas Sekarang</button>
        </div>
      </Modal>

      {/* Kas Awal Modal */}
      <Modal isOpen={isKasAwalModalOpen} onClose={() => setIsKasAwalModalOpen(false)} title="Input Kas Awal">
        <div style={{ marginBottom: '24px' }}>
          <label className="form-label">Masukkan Nominal Kas Awal (Modal Kembalian)</label>
          <CurrencyInput
            value={kasAwalAmount}
            onChange={setKasAwalAmount}
            placeholder="0"
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Kas awal ini akan digunakan sebagai saldo awal hari ini. Pastikan untuk menekan Buka Kas/Simpan.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => setIsKasAwalModalOpen(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSaveKasAwal}>Simpan</button>
        </div>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Tambah Pengeluaran">
        <form onSubmit={handleAddExpense}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Kategori Pengeluaran</label>
            <CustomSelect
              value={expenseForm.category}
              onChange={(val) => setExpenseForm({...expenseForm, category: val})}
              options={[
                { value: 'Gaji Karyawan', label: 'Gaji Karyawan' },
                { value: 'Wifi', label: 'Wifi' },
                { value: 'Listrik', label: 'Listrik' },
                { value: 'Lainnya', label: 'Lainnya' }
              ]}
              placeholder="Pilih Kategori"
              minWidth="100%"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Nominal (Rp)</label>
            <CurrencyInput required value={expenseForm.amount} onChange={val => setExpenseForm({...expenseForm, amount: val})} placeholder="Contoh: 50.000" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Keterangan (Opsional)</label>
            <input type="text" className="form-input" value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} placeholder="Tambahkan catatan..." />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '12px 0' }} onClick={() => setIsExpenseModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px 0' }}>Simpan</button>
          </div>
        </form>
      </Modal>

      {/* Owner Auth Modal for Resetting Reports */}
      <OwnerAuthModal
        isOpen={isOwnerAuthResetOpen}
        onClose={() => setIsOwnerAuthResetOpen(false)}
        onSuccess={executeResetReports}
        title="Otorisasi Reset Laporan"
        description="PERINGATAN: Seluruh data transaksi penjualan, sesi kas, dan pengeluaran akan direset ke Rp 0. Data produk dan stok master TETAP AMAN. Masukkan password Owner untuk melanjutkan:"
        actionText="Ya, Reset Laporan"
      />
    </div>
  );
}
