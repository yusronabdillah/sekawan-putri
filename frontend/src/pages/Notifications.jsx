import React, { useState } from 'react';
import { useAuthStore } from '../store/store';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Check, Trash2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { AppCard, AppButton, AppBadge, AppEmptyState } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [search, setSearch] = useState('');

  const notifications = useLiveQuery(async () => {
    if (!user) return [];
    const allNotifs = await db.notifications.toArray();
    
    // Filter by user role or specific ID
    let userNotifs = allNotifs.filter(n => 
      (n.user_id === user.id || (n.user_id === 'OWNER' && user.role === 'OWNER')) && n.is_read === 0
    );
    
    // Sort by newest first
    userNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return userNotifs;
  }, [user]);

  if (!notifications) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;

  let filtered = notifications;
  // Automatically only showing unread notifications based on query above
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(n => n.title.toLowerCase().includes(lower) || n.message.toLowerCase().includes(lower));
  }

  // Group by date
  const grouped = {};
  filtered.forEach(n => {
    const d = new Date(n.created_at);
    const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(n);
  });

  const markAsRead = async (id, e) => {
    if(e) e.stopPropagation();
    await db.notifications.update(id, { is_read: 1 });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.is_read === 0);
    for (const n of unread) {
      await db.notifications.update(n.id, { is_read: 1 });
    }
  };

  const clearAll = async () => {
    if (window.confirm('Hapus semua notifikasi?')) {
      const ids = notifications.map(n => n.id);
      await db.notifications.bulkDelete(ids);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.is_read === 0) {
      await markAsRead(notif.id);
    }
    
    if (user?.role === 'OWNER') {
      navigate('/warehouse?tab=approvals');
    } else {
      navigate('/warehouse');
    }
  };

  const getIcon = (type) => {
    if (type?.includes('APPROVE') || type?.includes('SUCCESS')) return <CheckCircle size={20} color="var(--success)" />;
    if (type?.includes('REJECT') || type?.includes('DENY')) return <XCircle size={20} color="var(--danger)" />;
    return <Bell size={20} color="var(--primary)" />;
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <div className="header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Notification Center</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pusat pemberitahuan dan aktivitas.</p>
        </div>
      </div>

      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Total Unread: {notifications.length}</span>
        </div>
        <div className="search-box" style={{ width: '250px' }}>
          <input 
            type="text" 
            placeholder="Cari notifikasi..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', width: '100%' }}
          />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <AppEmptyState 
          icon={<Bell size={48} />}
          title="Tidak Ada Notifikasi"
          description="Saat ini belum ada notifikasi masuk untuk Anda."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.keys(grouped).map(dateStr => (
            <div key={dateStr}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {dateStr}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grouped[dateStr].map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      gap: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface)', borderRadius: '50%', display: 'flex', height: 'fit-content' }}>
                      {getIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{notif.title}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '8px' }}>{notif.message}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>
                          {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                        <AppButton variant="secondary" onClick={(e) => markAsRead(notif.id, e)} style={{ fontSize: '12px', padding: '6px 12px' }}>Tandai Dibaca</AppButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
