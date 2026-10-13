import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, BarChart2, Menu, Inbox, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/store';

export default function BottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  const currentSearch = location.search || '';
  
  const navStyle = {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 'var(--content-max-width)',
    backgroundColor: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 8px calc(env(safe-area-inset-bottom, 12px) + 8px) 8px',
    zIndex: 40,
    boxShadow: 'var(--shadow-lg)'
  };

  if (user?.role === 'KASIR' || user?.role === 'KARYAWAN') {
    return (
      <nav style={navStyle}>
        <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
          <ShoppingCart size={24} />
          <span>Kasir</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
          <Menu size={24} />
          <span>Lainnya</span>
        </NavLink>
      </nav>
    );
  }

  if (user?.role === 'GUDANG') {
    const isWarehouse = location.pathname === '/warehouse';
    
    return (
      <nav style={navStyle}>
        <NavLink to="/warehouse" end className={({ isActive }) => `nav-item ${isActive && !currentSearch ? 'active-nav' : ''}`}>
          <Home size={24} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
          <Package size={24} />
          <span>Inventory</span>
        </NavLink>
        <NavLink to="/warehouse?tab=receiving" className={() => `nav-item ${isWarehouse && currentSearch.includes('tab=receiving') ? 'active-nav' : ''}`}>
          <Inbox size={24} />
          <span>Masuk</span>
        </NavLink>
        <NavLink to="/warehouse?tab=restock" className={() => `nav-item ${isWarehouse && currentSearch.includes('tab=restock') ? 'active-nav' : ''}`}>
          <RefreshCw size={24} />
          <span>Restock</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
          <Menu size={24} />
          <span>Lainnya</span>
        </NavLink>
      </nav>
    );
  }

  return (
    <nav style={navStyle}>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
        <Home size={24} />
        <span>Beranda</span>
      </NavLink>
      <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
        <ShoppingCart size={24} />
        <span>Kasir</span>
      </NavLink>
      <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
        <Package size={24} />
        <span>Stok</span>
      </NavLink>
      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
        <BarChart2 size={24} />
        <span>Laporan</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active-nav' : ''}`}>
        <Menu size={24} />
        <span>Lainnya</span>
      </NavLink>
    </nav>
  );
}
