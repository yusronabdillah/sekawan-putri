import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/store';
import BottomNav from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import Warehouse from './pages/Warehouse';
import Notifications from './pages/Notifications';
import { ToastProvider } from './components/ToastProvider';
import { SyncProvider } from './components/SyncProvider';
import { useNetworkState } from './hooks/useNetworkState';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { WifiOff, RefreshCw } from 'lucide-react';

function ProtectedRoute({ children, rolesAllowed }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (rolesAllowed && !rolesAllowed.includes(user?.role)) {
    // Redirect to default page based on role if unauthorized
    if (user?.role === 'OWNER') return <Navigate to="/" />;
    if (user?.role === 'GUDANG') return <Navigate to="/warehouse" />;
    return <Navigate to="/pos" />;
  }
  
  return children;
}

function RootRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'OWNER') return <Dashboard />;
  if (user?.role === 'GUDANG') return <Navigate to="/warehouse" />;
  return <Navigate to="/pos" />;
}

function NetworkIndicator() {
  const { isOnline } = useNetworkState();
  const syncingItems = useLiveQuery(() => db.sync_queue.where('status').equals('SYNCING').count(), []) || 0;
  const pendingItems = useLiveQuery(() => db.sync_queue.where('status').anyOf(['PENDING', 'FAILED']).count(), []) || 0;

  if (!isOnline) {
    return (
      <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--danger)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <WifiOff size={14} /> Offline Mode
      </div>
    );
  }

  if (syncingItems > 0 || pendingItems > 0) {
    return (
      <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--warning)', color: 'black', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <RefreshCw size={14} className="spin" /> Syncing ({pendingItems + syncingItems})
      </div>
    );
  }

  return null; // Hidden when online and nothing to sync
}

function PageTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in" style={{ animationDuration: '0.25s', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {children}
    </div>
  );
}

export default function App() {
  console.log('🚀 [STARTUP] 1. App Component Mounted');
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // ONE-TIME SCRIPT to append 1 KG to all Sayur category products
    const fixSayurNames = async () => {
      if (localStorage.getItem('sayur_1kg_fixed')) return;
      try {
        const sayurs = await db.products.where('category').equals('Sayur').toArray();
        let changed = false;
        for (const s of sayurs) {
          let newName = s.name;
          if (!newName.toUpperCase().includes('1KG') && !newName.toUpperCase().includes('1 KG')) {
            newName = `${newName} 1 KG`.toUpperCase();
            await db.products.update(s.id, { name: newName, unit: 'Kg' });
            changed = true;
          } else if (s.unit !== 'Kg') {
            await db.products.update(s.id, { unit: 'Kg' });
            changed = true;
          }
        }
        localStorage.setItem('sayur_1kg_fixed', 'true');
        console.log('Fixed sayur names!');
        if (changed) window.location.reload();
      } catch (e) {
        console.error(e);
      }
    };
    fixSayurNames();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    let debounceTimer;
    const triggerSync = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (window.navigator.onLine) {
          console.log('[AUTO-SYNC] Triggered by App visibility/online state');
          import('./services/syncService').then(({ syncService }) => {
            syncService.pullData().catch(console.error);
            syncService.processQueue().catch(console.error);
          });
        }
      }, 1000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', triggerSync);
    
    // Also periodic sync every 5 minutes just in case
    const interval = setInterval(triggerSync, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', triggerSync);
      clearInterval(interval);
      clearTimeout(debounceTimer);
    };
  }, [isAuthenticated]);

  return (
    <div className="app-container">
      <NetworkIndicator />
      <div className={isAuthenticated ? "content-area" : ""}>
        <ErrorBoundary>
          {isAuthenticated ? (
            <SyncProvider>
              <ToastProvider>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />
                    <Route path="/pos" element={<ProtectedRoute rolesAllowed={['OWNER', 'KASIR']}><POS /></ProtectedRoute>} />
                    
                    <Route path="/inventory" element={<ProtectedRoute rolesAllowed={['OWNER', 'GUDANG']}><Inventory /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute rolesAllowed={['OWNER']}><Reports /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/employees" element={<ProtectedRoute rolesAllowed={['OWNER']}><Employees /></ProtectedRoute>} />
                    
                    <Route path="/warehouse" element={<ProtectedRoute rolesAllowed={['OWNER', 'GUDANG']}><Warehouse /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  </Routes>
                </PageTransition>
              </ToastProvider>
            </SyncProvider>
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      {isAuthenticated && <BottomNav />}
    </div>
  );
}

