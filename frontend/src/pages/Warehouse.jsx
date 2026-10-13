import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, Truck, AlertTriangle, Clock, ListChecks, FileText, Bell, ChevronRight, RefreshCw } from 'lucide-react';
import { db } from '../db/db';
import WarehouseReceiving from '../components/warehouse/WarehouseReceiving';
import BatchManagement from '../components/warehouse/BatchManagement';
import WarehouseRestock from '../components/warehouse/WarehouseRestock';
import WarehouseApproval from '../components/warehouse/WarehouseApproval';
import { useAuthStore } from '../store/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../components/ui';

export default function Warehouse() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'dashboard';
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  const unreadNotifsCount = useLiveQuery(async () => {
    if (!user) return 0;
    try {
      const notifs = await db.notifications.toArray();
      return notifs.filter(n => (n.user_id === user.id || (n.user_id === 'OWNER' && user.role === 'OWNER')) && n.is_read === 0).length;
    } catch (e) {
      return 0;
    }
  }, [user]);

  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeBatches: 0,
    outOfStock: 0,
    expiringSoon: 0,
    expired: 0,
    pendingRestock: 0,
    pendingApproval: 0
  });

  const [urgentData, setUrgentData] = useState({
    lowStockProducts: [],
    expiringBatches: []
  });

  useEffect(() => {
    loadMetrics();
  }, [currentTab]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const products = await db.products.toArray();
      const batches = await db.batches.toArray();
      const approvals = await db.approvals.where('status').equals('Pending').toArray();
      const restocks = await db.restock_requests.where('status').equals('Pending Approval').toArray();

      const now = new Date();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      let expiringCount = 0;
      let expiredCount = 0;
      let activeBatchCount = 0;
      const expiringBatchesList = [];

      batches.forEach(b => {
        if (b.qty > 0) {
          activeBatchCount++;
          if (b.exp_date) {
            const exp = new Date(b.exp_date);
            if (exp < now) {
              expiredCount++;
              expiringBatchesList.push({...b, status: 'Expired'});
            } else if ((exp - now) < thirtyDaysMs) {
              expiringCount++;
              expiringBatchesList.push({...b, status: 'Hampir Expired'});
            }
          }
        }
      });

      const lowStockList = products.filter(p => p.stock <= 0).sort((a,b) => a.stock - b.stock);

      setMetrics({
        totalProducts: products.length,
        activeBatches: activeBatchCount,
        outOfStock: lowStockList.length,
        expiringSoon: expiringCount,
        expired: expiredCount,
        pendingRestock: restocks.length,
        pendingApproval: approvals.length
      });

      setUrgentData({
        lowStockProducts: lowStockList.slice(0, 5), // top 5
        expiringBatches: expiringBatchesList.sort((a,b) => new Date(a.exp_date) - new Date(b.exp_date)).slice(0, 5) // top 5
      });
    } catch (err) {
      console.error('Error loading warehouse metrics:', err);
    }
    setIsLoading(false);
  };

  let tabs = [];
  if (user?.role === 'OWNER') {
    tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: Package },
      { id: 'receiving', label: 'Barang Masuk', icon: Truck },
      { id: 'batches', label: 'Batch & Expired', icon: Clock },
      { id: 'restock', label: 'Restock', icon: ListChecks },
      { id: 'approvals', label: 'Approval', icon: FileText }
    ];
  } else {
    tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: Package },
      { id: 'receiving', label: 'Barang Masuk', icon: Truck },
      { id: 'batches', label: 'Batch & Expired', icon: Clock },
      { id: 'restock', label: 'Restock', icon: ListChecks }
    ];
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'receiving': return <WarehouseReceiving onSave={() => { navigate('/warehouse'); loadMetrics(); }} />;
      case 'batches': return <BatchManagement />;
      case 'restock': return <WarehouseRestock />;
      case 'approvals': return <WarehouseApproval />;
      case 'dashboard':
      default:
        return (
          <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '32px' }}>
            
            {/* 1. AKSI CEPAT (QUICK ACTIONS) */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={22} color="var(--primary)" /> Aksi Cepat
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px', gap: '12px', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', border: 'none' }}
                  onClick={() => navigate('/warehouse?tab=receiving')}
                >
                  <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '16px', color: 'white' }}>
                    <Truck size={24} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>Barang Masuk</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>Input stok baru</div>
                  </div>
                </button>

                <button 
                  className="btn" 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px', gap: '12px', borderRadius: '24px', backgroundColor: '#F9FAFB', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-main)' }}
                  onClick={() => navigate('/warehouse?tab=restock')}
                >
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '16px', color: 'var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <ListChecks size={24} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800' }}>Ajukan Restock</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Permintaan stok</div>
                  </div>
                </button>

                <button 
                  className="btn" 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px', gap: '12px', borderRadius: '24px', backgroundColor: '#F9FAFB', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-main)' }}
                  onClick={() => navigate('/warehouse?tab=batches')}
                >
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '16px', color: '#f59e0b', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Clock size={24} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800' }}>Cek Expired</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Pantau kadaluarsa</div>
                  </div>
                </button>

                {user?.role === 'OWNER' && (
                  <button 
                    className="btn" 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px', gap: '12px', borderRadius: '24px', backgroundColor: '#F9FAFB', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-main)' }}
                    onClick={() => navigate('/warehouse?tab=approvals')}
                  >
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '16px', color: '#3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <FileText size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800' }}>Approval</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Persetujuan dokumen</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* 2. SUMMARY CARDS */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListChecks size={22} color="var(--primary)" /> Ringkasan Inventaris
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                
                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: 'var(--primary)' }}><Package size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: 'var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><Package size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL PRODUK</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', zIndex: 1 }}>{metrics.totalProducts}</div>
                </div>

                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #EEF8F3 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: '#10b981' }}><ListChecks size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#10b981', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><ListChecks size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>BATCH AKTIF</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', zIndex: 1 }}>{metrics.activeBatches}</div>
                </div>
                
                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #FFF8EB 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: '#f59e0b' }}><Clock size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#f59e0b', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><Clock size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>HAMPIR EXPIRED</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: metrics.expiringSoon > 0 ? '#f59e0b' : 'var(--text-main)', zIndex: 1 }}>{metrics.expiringSoon}</div>
                </div>

                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: '#ef4444' }}><AlertTriangle size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><AlertTriangle size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>SUDAH EXPIRED</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: metrics.expired > 0 ? '#ef4444' : 'var(--text-main)', zIndex: 1 }}>{metrics.expired}</div>
                </div>

                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: '#ea580c' }}><Truck size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#ea580c', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><Truck size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>STOK KOSONG</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: metrics.outOfStock > 0 ? '#ea580c' : 'var(--text-main)', zIndex: 1 }}>{metrics.outOfStock}</div>
                </div>

                <div style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'scale(2.5)', color: '#3b82f6' }}><FileText size={40} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><FileText size={20} /></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>APPROVAL TERTUNDA</div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: metrics.pendingApproval > 0 ? '#3b82f6' : 'var(--text-main)', zIndex: 1 }}>{metrics.pendingApproval}</div>
                </div>

              </div>
            </div>

            {/* 3. CRITICAL TABLES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              
              {/* KOLOM KIRI: Stok Menipis */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} color="#ef4444" /> Stok Kritis & Menipis
                  </h3>
                  <div 
                    onClick={() => navigate('/warehouse?tab=restock')} 
                    style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Lihat Semua <ChevronRight size={16} />
                  </div>
                </div>
                <div className="card" style={{ padding: '16px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: 1, backgroundColor: '#FFFFFF' }}>
                  {urgentData.lowStockProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Stok aman. Tidak ada produk kritis.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {urgentData.lowStockProducts.map((p, idx) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx !== urgentData.lowStockProducts.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{p.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>{p.category}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444', backgroundColor: '#FFF1F2', padding: '4px 12px', borderRadius: '12px', border: '1px solid #FECDD3' }}>Sisa: {p.stock}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* KOLOM KANAN: Expiring Batches */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} color="#f59e0b" /> Peringatan Expired
                  </h3>
                  <div 
                    onClick={() => navigate('/warehouse?tab=batches')} 
                    style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Lihat Semua <ChevronRight size={16} />
                  </div>
                </div>
                <div className="card" style={{ padding: '16px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: 1, backgroundColor: '#FFFFFF' }}>
                  {urgentData.expiringBatches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Tidak ada batch mendekati expired.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {urgentData.expiringBatches.map((b, idx) => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx !== urgentData.expiringBatches.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: b.status === 'Expired' ? '#ef4444' : '#f59e0b' }}>{b.product_name}</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>Sisa: {b.qty} • Batch: {b.batch_number || '-'}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: b.status === 'Expired' ? '#ef4444' : '#f59e0b' }}>
                              {new Date(b.exp_date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '800', color: b.status === 'Expired' ? '#ef4444' : '#f59e0b', marginTop: '2px' }}>{b.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
          <div>Memuat data gudang...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="Gudang"
        subtitle="Sistem Manajemen Inventaris & Batch"
        icon={Package}
        actions={
          <button 
            className="header-icon-btn" 
            aria-label="Notifikasi" 
            onClick={() => navigate('/notifications')}
            style={{ 
              position: 'relative', 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              padding: '10px', 
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={20} color="var(--text-main)" />
            {unreadNotifsCount > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '-4px', 
                right: '-4px', 
                backgroundColor: 'var(--danger)', 
                color: 'white', 
                fontSize: '10px', 
                fontWeight: 'bold',
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
              </div>
            )}
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(`/warehouse?tab=${tab.id}`)}
            className={`btn ${currentTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', borderRadius: '20px' }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="content-body">
        {renderContent()}
      </div>
    </div>
  );
}
