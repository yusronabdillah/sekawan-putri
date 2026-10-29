import React, { useState } from 'react';
import { db } from '../db/db';
import { hashPassword } from '../utils/hash';
import { ShieldAlert, Lock, Eye, EyeOff, X } from 'lucide-react';

export default function OwnerAuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Otorisasi Owner Diperlukan", 
  description = "Tindakan ini bersifat sensitif dan memerlukan verifikasi Owner. Masukkan password akun Owner untuk melanjutkan:", 
  actionText = "Verifikasi & Lanjutkan" 
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Password Owner wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const owner = await db.users.where('role').equals('OWNER').first();
      if (!owner) {
        setError('Akun role Owner tidak ditemukan di sistem');
        setLoading(false);
        return;
      }

      const inputHash = await hashPassword(password);
      if (owner.password_hash !== inputHash) {
        setError('Password Owner salah! Akses ditolak.');
        setLoading(false);
        return;
      }

      // Successful verification
      setPassword('');
      setError('');
      onClose();
      onSuccess();
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--surface, #ffffff)',
          borderRadius: '20px',
          maxWidth: '420px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-main, #0f172a)',
          border: '1px solid var(--border, #e2e8f0)',
          animation: 'scaleIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', 
              height: '44px', 
              borderRadius: '12px',
              backgroundColor: '#fee2e2', 
              color: '#dc2626',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#dc2626' }}>{title}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Proteksi Keamanan Sistem</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#94a3b8', 
              padding: '4px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted, #475569)', marginBottom: '18px', lineHeight: '1.5' }}>
          {description}
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', 
            borderRadius: '10px',
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca',
            color: '#b91c1c', 
            fontSize: '13px', 
            marginBottom: '16px',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: '500'
          }}>
            <Lock size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main, #334155)' }}>
              Password Akun Owner:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Owner..."
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border, #cbd5e1)',
                  backgroundColor: 'var(--bg, #f8fafc)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '10px 18px', 
                borderRadius: '10px',
                border: '1px solid #cbd5e1', 
                backgroundColor: 'var(--bg, #f1f5f9)',
                color: 'var(--text-muted, #475569)', 
                fontSize: '13px', 
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px', 
                borderRadius: '10px',
                border: 'none', 
                backgroundColor: '#dc2626',
                color: '#ffffff', 
                fontSize: '13px', 
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)'
              }}
            >
              {loading ? 'Memverifikasi...' : actionText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
