import React, { useEffect, useState, createContext, useRef } from 'react';
import { db } from '../db/db';
import { useAuthStore } from '../store/store';
import { Bell, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from '../services/syncService';

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const seenNotifIds = useRef(new Set());

  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  const notifications = useLiveQuery(async () => {
    if (!user) return [];
    const all = await db.notifications
      .filter(n => n.user_id === user.id || (n.user_id === 'OWNER' && user.role === 'OWNER'))
      .toArray();
    
    all.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestUnread = all.find(n => n.is_read === 0);
    return latestUnread ? [latestUnread] : [];
  }, [user]);

  useEffect(() => {
    if (!notifications) return;
    
    let hasNew = false;
    notifications.forEach(notif => {
      if (notif.is_read === 0 && !seenNotifIds.current.has(notif.id)) {
        seenNotifIds.current.add(notif.id);
        hasNew = true;
        
        setToasts([notif]); // Only show the latest one
        
        notificationService.showNativeNotification(notif.title, notif.message);
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== notif.id));
        }, 6000);
      }
    });
  }, [notifications]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id) => {
    try {
      await db.notifications.update(id, { is_read: 1 });
      await syncService.addToQueue('notifications', 'UPDATE', { id, is_read: 1 });
    } catch (e) { console.error(e); }
  };

  const handleToastClick = async (toast) => {
    removeToast(toast.id);
    await markAsRead(toast.id);
    if (user?.role === 'OWNER') {
      navigate('/warehouse?tab=approvals');
    } else {
      navigate('/warehouse');
    }
  };

  const handleCloseToast = async (toast, e) => {
    e.stopPropagation();
    removeToast(toast.id);
    await markAsRead(toast.id);
  };

  const getIcon = (type) => {
    if (type?.includes('APPROVE') || type?.includes('SUCCESS')) return <CheckCircle size={20} color="var(--success)" />;
    if (type?.includes('REJECT') || type?.includes('DENY')) return <X size={20} color="var(--danger)" />;
    return <Bell size={20} color="var(--primary)" />;
  };

  const getIconBg = (type) => {
    if (type?.includes('APPROVE') || type?.includes('SUCCESS')) return 'var(--success-light)';
    if (type?.includes('REJECT') || type?.includes('DENY')) return 'var(--danger-light)';
    return 'var(--primary-light)';
  };

  return (
    <ToastContext.Provider value={{}}>
      {children}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="animate-zoom-in" style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-xl)',
            padding: '16px',
            width: '320px',
            pointerEvents: 'auto',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onClick={() => handleToastClick(toast)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ backgroundColor: getIconBg(toast.type), padding: '10px', borderRadius: '50%', display: 'flex' }}>
              {getIcon(toast.type)}
            </div>
            <div style={{ flex: 1, marginTop: '2px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px', color: 'var(--text-main)', lineHeight: '1.2' }}>{toast.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{toast.message}</div>
            </div>
            <button 
              onClick={(e) => handleCloseToast(toast, e)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
