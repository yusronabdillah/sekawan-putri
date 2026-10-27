import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useBillScheduleStore } from '../store/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  TrendingUp, 
  Activity, 
  Package, 
  AlertTriangle, 
  Monitor, 
  PlusSquare, 
  Box, 
  BarChart2, 
  CheckCircle2, 
  Clock,
  Home,
  Bell,
  Cloud,
  UserCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Check,
  WifiOff,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNetworkState } from '../hooks/useNetworkState';

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
        <p style={{ margin: '0 0 8px 0', fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{entry.name}:</span>
            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '12px' }}>Rp {Number(entry.value || 0).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isOnline } = useNetworkState();
  const syncingItems = useLiveQuery(() => db.sync_queue.where('status').equals('SYNCING').count(), []) || 0;
  const pendingItems = useLiveQuery(() => db.sync_queue.where('status').anyOf(['PENDING', 'FAILED']).count(), []) || 0;

  const stats = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Fetch transactions
    const allTxs = await db.transactions
      .filter(t => new Date(t.created_at) >= sevenDaysAgo && t.status === 'COMPLETED')
      .sortBy('created_at'); 

    const todayTxs = allTxs.filter(t => new Date(t.created_at) >= today);
    const yesterdayTxs = allTxs.filter(t => {
      const d = new Date(t.created_at);
      return d >= yesterday && d < today;
    });

    let todayRevenue = 0;
    let todayCost = 0;
    let todayItemsSold = 0;
    let todayItemsSayur = 0;
    for (const tx of todayTxs) {
      todayRevenue += tx.total_amount;
      const items = await db.transaction_items.where('transaction_id').equals(tx.id).toArray();
      for (const item of items) {
        const prod = await db.products.get(item.product_id);
        const qtyNum = Number(item.qty) || 0;
        if (prod) {
          todayCost += (prod.cost_price || 0) * qtyNum;
          if (prod.category === 'Sayur') {
             todayItemsSayur += qtyNum;
          } else {
             todayItemsSold += qtyNum;
          }
        }
      }
    }

    let yesterdayRevenue = 0;
    let yesterdayCost = 0;
    let yesterdayItemsSold = 0;
    let yesterdayItemsSayur = 0;
    for (const tx of yesterdayTxs) {
      yesterdayRevenue += tx.total_amount;
      const items = await db.transaction_items.where('transaction_id').equals(tx.id).toArray();
      for (const item of items) {
        const prod = await db.products.get(item.product_id);
        const qtyNum = Number(item.qty) || 0;
        if (prod) {
          yesterdayCost += (prod.cost_price || 0) * qtyNum;
          if (prod.category === 'Sayur') {
             yesterdayItemsSayur += qtyNum;
          } else {
             yesterdayItemsSold += qtyNum;
          }
        }
      }
    }

    const recentTxs = [...todayTxs].reverse().slice(0, 5);

    const products = await db.products.toArray();
    const criticalStockItems = products.filter(p => p.stock <= 0);
    
    // Expenses
    const allExps = await db.expenses.toArray();
    const todayExpenses = allExps.filter(e => new Date(e.created_at) >= today).reduce((sum, e) => sum + (e.amount || 0), 0);
    const yesterdayExpenses = allExps.filter(e => {
       const d = new Date(e.created_at);
       return d >= yesterday && d < today;
    }).reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const todayNetProfit = todayRevenue - todayCost - todayExpenses;
    const yesterdayNetProfit = yesterdayRevenue - yesterdayCost - yesterdayExpenses;
    
    // Group revenue for 7 days
    const chartData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dStart = new Date(d).setHours(0,0,0,0);
      const dEnd = new Date(d).setHours(23,59,59,999);
      
      const dayTxs = allTxs.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate >= dStart && tDate <= dEnd;
      });
      const dayRevenue = dayTxs.reduce((sum, t) => sum + t.total_amount, 0);
      
      chartData.push({
        day: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        revenue: dayRevenue
      });
    }

    const pendingApprovals = await db.approvals.where('status').equals('Pending').toArray();
    
    let expiringCount = 0;
    try {
      const batches = await db.batches.toArray();
      const now = new Date();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      batches.forEach(b => {
        if (b.qty > 0 && b.exp_date) {
          const exp = new Date(b.exp_date);
          if ((exp - now) < thirtyDaysMs) {
            expiringCount++;
          }
        }
      });
    } catch (err) {
      // Ignore if table doesn't exist yet
    }

    let unreadNotificationCount = 0;
    try {
      const notifs = await db.notifications.toArray();
      const unread = notifs.filter(n => 
        (n.user_id === user?.id || (n.user_id === 'OWNER' && user?.role === 'OWNER')) && n.is_read === 0
      );
      unreadNotificationCount = unread.length;
    } catch (err) {
      // Ignore if table doesn't exist yet
    }

    return {
      todayRevenue,
      yesterdayRevenue,
      todayNetProfit,
      yesterdayNetProfit,
      todayCount: todayTxs.length,
      yesterdayCount: yesterdayTxs.length,
      todayItemsSold,
      todayItemsSayur,
      yesterdayItemsSold,
      yesterdayItemsSayur,
      criticalStockCount: criticalStockItems.length,
      criticalStockItems,
      pendingApprovalCount: pendingApprovals.length,
      expiringCount,
      unreadNotificationCount,
      recentTxs,
      chartData,
      expenses: await db.expenses.filter(e => new Date(e.created_at) >= new Date(today.getFullYear(), today.getMonth(), 1)).toArray()
    };
  }, [user]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 11) return 'Selamat Pagi';
    if (hr < 15) return 'Selamat Siang';
    if (hr < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };
  
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  const { schedules } = useBillScheduleStore();
  const getDueBills = () => {
    if (!stats) return [];
    const today = new Date();
    const currentMonthDate = today.getDate();
    let currentWeekDay = today.getDay();
    if (currentWeekDay === 0) currentWeekDay = 7;
    
    return schedules.filter(s => {
      const isPaid = stats.expenses?.some(e => {
         if (e.category.toLowerCase() !== s.name.toLowerCase()) return false;
         const expDate = new Date(e.created_at);
         if (s.type === 'Bulanan') {
            return expDate.getMonth() === today.getMonth() && expDate.getFullYear() === today.getFullYear();
         } else {
            const diffDays = Math.ceil(Math.abs(today - expDate) / (1000 * 60 * 60 * 24)); 
            return diffDays <= 7;
         }
      });
      if (isPaid) return false;

      if (s.type === 'Bulanan') {
        // Show reminder ONLY on the exact due date
        return currentMonthDate === s.day;
      } else {
        return currentWeekDay === s.day;
      }
    });
  };
  
  const dueBills = getDueBills();
  const getTrend = (current, past) => {
    if (past === 0) return null; // No data to compare
    const diff = current - past;
    const percent = (diff / past) * 100;
    return {
      isUp: percent > 0,
      isEqual: percent === 0,
      value: Math.abs(percent).toFixed(1)
    };
  };

  if (!stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <div style={{ fontWeight: '600' }}>Menyiapkan Workspace...</div>
      </div>
    </div>
  );

  return (
    <div className="page-transition" style={{ paddingBottom: '32px' }}>
      
      {/* HEADER SECTION - Premium Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F7FB 100%)',
        borderRadius: '24px',
        padding: '32px 28px',
        marginBottom: '32px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Blobs */}
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '250px', height: '250px', background: 'var(--primary)', opacity: '0.04', filter: 'blur(50px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', left: '20%', bottom: '-80px', width: '200px', height: '200px', background: 'var(--secondary)', opacity: '0.03', filter: 'blur(40px)', borderRadius: '50%' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '2px solid white' }}>
              <img 
                src="./logo_toko.jpeg" 
                alt="Logo Sekawan Putri" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} 
                onError={(e) => { 
                  e.target.style.display = 'none'; 
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <Home size={32} color="var(--primary)" style={{ display: 'none' }} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {currentDate}
              </p>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isOnline ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                <WifiOff size={16} /> Offline
              </div>
            ) : (syncingItems > 0 || pendingItems > 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                <RefreshCw size={16} className="spin" /> Syncing
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                <Cloud size={16} /> Online
              </div>
            )}
            <button 
              className="header-icon-btn" 
              aria-label="Notifikasi" 
              onClick={() => window.location.hash = '#/notifications'}
              style={{ position: 'relative' }}
            >
              <Bell size={20} color="var(--text-main)" />
              {stats.unreadNotificationCount > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  backgroundColor: 'var(--danger)', 
                  color: 'white',
                  borderRadius: '10px', 
                  border: '2px solid var(--surface)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  minWidth: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {stats.unreadNotificationCount > 99 ? '99+' : stats.unreadNotificationCount}
                </div>
              )}
            </button>
            <button 
              className="header-icon-btn" 
              aria-label="Profil Menu"
              onClick={() => navigate('/settings')}
            >
              <UserCircle2 size={24} color="var(--primary)" />
            </button>
          </div>
        </div>
      </div>

      {dueBills.length > 0 && (
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--warning-light)', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--warning)' }}>
          <div style={{ backgroundColor: 'var(--warning)', padding: '12px', borderRadius: '50%', color: 'white', display: 'flex' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '16px' }}>Pengingat Pengeluaran Rutin!</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Saatnya membayar/mencatat: <strong>{dueBills.map(b => b.name).join(', ')}</strong>. Segera catat di menu Laporan &gt; Pengeluaran.
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS - Responsive Auto-fit Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', marginBottom: '32px' }}>
        <SummaryCard 
          title="Pendapatan Hari Ini" 
          value={`Rp ${stats.todayRevenue?.toLocaleString('id-ID') || 0}`} 
          trend={getTrend(stats.todayRevenue, stats.yesterdayRevenue)}
          icon={<DollarSign size={24} color="#059669" />} 
          gradient="linear-gradient(135deg, #EEFDF8 0%, #FFFFFF 100%)"
          accentColor="#059669"
        />
        <SummaryCard 
          title="Laba Bersih Hari Ini" 
          value={`Rp ${stats.todayNetProfit?.toLocaleString('id-ID') || 0}`} 
          trend={getTrend(stats.todayNetProfit, stats.yesterdayNetProfit)}
          icon={<DollarSign size={24} color="#3b82f6" />} 
          gradient="linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)"
          accentColor="#3b82f6"
        />
        <SummaryCard 
          title="Total Transaksi" 
          value={stats.todayCount} 
          trend={getTrend(stats.todayCount, stats.yesterdayCount)}
          icon={<Activity size={24} color="#059669" />} 
          gradient="linear-gradient(135deg, #EEFDF8 0%, #FFFFFF 100%)"
          accentColor="#059669"
        />
        <SummaryCard 
          title="KEMASAN TERJUAL (PCS)" 
          value={Number(stats.todayItemsSold || 0).toLocaleString('id-ID')} 
          trend={getTrend(stats.todayItemsSold, stats.yesterdayItemsSold)}
          icon={<Package size={24} color="#F59E0B" />} 
          gradient="linear-gradient(135deg, #FFF8EB 0%, #FFFFFF 100%)"
          accentColor="#F59E0B"
        />
        <SummaryCard 
          title="SAYUR TERJUAL (KG)" 
          value={Number(stats.todayItemsSayur || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} 
          trend={getTrend(stats.todayItemsSayur, stats.yesterdayItemsSayur)}
          icon={<Package size={24} color="#F59E0B" />} 
          gradient="linear-gradient(135deg, #FFF8EB 0%, #FFFFFF 100%)"
          accentColor="#F59E0B"
        />
        <SummaryCard 
          title="Stok Kosong" 
          value={stats.criticalStockCount} 
          trend={null}
          icon={<AlertTriangle size={24} color="#EF4444" />} 
          gradient="linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)"
          accentColor="#EF4444"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '32px' }}>
        {/* QUICK ACTIONS */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>Aksi Cepat</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <QuickActionButton 
              icon={<Monitor size={28} />} 
              title="Buka Kasir" 
              desc="Mulai transaksi baru"
              onClick={() => window.location.hash = '#/pos'} 
              primary
            />
            <QuickActionButton 
              icon={<PlusSquare size={28} />} 
              title="Tambah Produk" 
              desc="Input barang baru"
              onClick={() => window.location.hash = '#/inventory'} 
            />
            <QuickActionButton 
              icon={<Box size={28} />} 
              title="Manajemen Stok" 
              desc="Pantau ketersediaan"
              onClick={() => window.location.hash = '#/inventory'} 
            />
            <QuickActionButton 
              icon={<BarChart2 size={28} />} 
              title="Laporan Harian" 
              desc="Rekap penjualan"
              onClick={() => window.location.hash = '#/reports'} 
            />
          </div>
        </div>

        {/* MINI CHART */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>Tren Pendapatan (7 Hari)</h2>
          <div className="card" style={{ padding: '24px 20px 16px', height: '240px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {stats.chartData.every(d => d.revenue === 0) ? (
              <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <BarChart2 size={40} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontWeight: '500', fontSize: '14px', margin: 0 }}>Belum ada data penjualan 7 hari terakhir</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {stats.chartData.length <= 2 ? (
                  <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.15} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp ${(val || 0).toLocaleString('id-ID')}`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={90} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.2 }} />
                    <Bar dataKey="revenue" name="Pendapatan" fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={50} animationDuration={700} />
                  </BarChart>
                ) : (
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.15} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp ${(val || 0).toLocaleString('id-ID')}`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={90} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="var(--secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--secondary)' }} dot={false} animationDuration={700} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* RECENT TRANSACTIONS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Transaksi Hari Ini</h2>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => window.location.hash = '#/reports'}>
              Lihat Semua <ChevronRight size={16} />
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {stats.recentTxs.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Clock size={24} color="var(--text-muted)" />
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Belum Ada Transaksi</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', fontWeight: '500' }}>Catat penjualan pertama Anda hari ini.</div>
                <button className="btn btn-primary" onClick={() => window.location.hash = '#/pos'} style={{ borderRadius: '12px' }}>
                  Buka Kasir
                </button>
              </div>
            ) : (
              <div>
                {stats.recentTxs.map((tx, idx) => {
                  const time = new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={tx.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 20px',
                      borderBottom: idx !== stats.recentTxs.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background-color 0.2s ease',
                      cursor: 'pointer'
                    }} className="hover-surface">
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>
                          {time}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>Pelanggan Umum</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {tx.id.split('-')[0].substring(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>
                          Rp {(tx.total_amount || 0).toLocaleString('id-ID')}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '2px 8px', borderRadius: '12px' }}>
                          LUNAS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CRITICAL STOCK */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Perlu Perhatian
            </h2>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            
            {/* NEW WAREHOUSE ALERTS */}
            {stats.pendingApprovalCount > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: 'var(--primary-light)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => window.location.hash = '#/warehouse?tab=approvals'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{stats.pendingApprovalCount} Menunggu Approval</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cek modul Gudang</div>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--primary)" />
              </div>
            )}

            {stats.expiringCount > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: 'var(--warning-light)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => window.location.hash = '#/warehouse?tab=batches'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--warning)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{stats.expiringCount} Batch Hampir Kedaluwarsa</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>&lt; 30 Hari menuju expired</div>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--warning)" />
              </div>
            )}

            {stats.criticalStockItems.length === 0 && stats.pendingApprovalCount === 0 && stats.expiringCount === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={24} color="var(--success)" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>Semua Aman</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tidak ada isu operasional.</div>
                </div>
              </div>
            ) : (
              <div>
                {stats.criticalStockItems.length > 0 && (
                  <>
                    <div style={{ padding: '16px 20px', backgroundColor: 'var(--danger-light)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AlertTriangle size={20} color="var(--danger)" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>{stats.criticalStockItems.length} Produk Habis</div>
                        <div style={{ fontSize: '12px', color: 'var(--danger)', opacity: 0.8 }}>Stok kosong, segera lakukan re-stock</div>
                      </div>
                    </div>
                    {stats.criticalStockItems.slice(0, 5).map((item, idx) => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '16px 20px',
                        borderBottom: idx !== Math.min(stats.criticalStockItems.length, 5) - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{item.name}</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--danger)', backgroundColor: 'var(--danger-light)', padding: '4px 12px', borderRadius: '24px' }}>
                          Sisa {item.stock}
                        </div>
                      </div>
                    ))}
                    {stats.criticalStockItems.length > 5 && (
                      <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }} className="hover-surface" onClick={() => window.location.hash = '#/inventory'}>
                        Lihat {stats.criticalStockItems.length - 5} Produk Lainnya
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function SummaryCard({ title, value, icon, trend, gradient, accentColor }) {
  return (
    <div className="card" style={{ 
      background: gradient, 
      marginBottom: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      borderRadius: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px'
    }}>
      <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '120px', height: '120px', background: accentColor, borderRadius: '50%', filter: 'blur(50px)', opacity: 0.15 }}></div>
      
      <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: '16px'
        }}>
          {icon}
        </div>
        
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px' }}>
          {title}
        </div>
        
        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
          {value}
        </div>
        
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', height: '20px' }}>
          {trend ? (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <span style={{ 
                color: trend.isEqual ? 'var(--text-muted)' : trend.isUp ? 'var(--success)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: trend.isEqual ? 'var(--surface-hover)' : trend.isUp ? 'var(--success-light)' : 'var(--danger-light)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {!trend.isEqual && (trend.isUp ? <ArrowUpRight size={14} style={{marginRight: '2px'}}/> : <ArrowDownRight size={14} style={{marginRight: '2px'}}/>)}
                {trend.isEqual ? 'Stabil' : `${trend.value}%`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>dibanding kemarin</span>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Pembaruan secara real-time
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, title, desc, onClick, primary }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        border: primary ? 'none' : '1px solid var(--border)', 
        background: primary ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : '#F9FAFB',
        borderRadius: '24px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start',
        gap: '12px',
        padding: '24px',
        margin: 0,
        boxShadow: primary ? '0 10px 25px -5px rgba(79, 70, 229, 0.4)' : 'var(--shadow-sm)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = primary ? '0 20px 30px -5px rgba(79, 70, 229, 0.5)' : 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = primary ? '0 10px 25px -5px rgba(79, 70, 229, 0.4)' : 'var(--shadow-sm)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(1px)';
      }}
    >
      <div style={{ 
        padding: '14px', 
        backgroundColor: primary ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF', 
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: primary ? 'white' : 'var(--primary)',
        boxShadow: primary ? 'none' : '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        {icon}
      </div>
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', color: primary ? 'white' : 'var(--text-main)', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: primary ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
          {desc}
        </div>
      </div>
    </button>
  );
}
