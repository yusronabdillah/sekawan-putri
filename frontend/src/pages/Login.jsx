import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { db } from '../db/db';
import { hashPassword } from '../utils/hash';
import { v4 as uuidv4 } from 'uuid';
import { Store, User, Lock, Eye, EyeOff, Loader2, ShieldAlert, Clock } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_TIME_MS = LOCKOUT_MINUTES * 60 * 1000;
const SECURITY_STORAGE_KEY = 'sekawan_login_security';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const loginStore = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  // Monitor and countdown lockout timer if locked out
  useEffect(() => {
    const checkLockout = () => {
      try {
        const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
        if (raw) {
          const sec = JSON.parse(raw);
          if (sec.lockoutUntil && sec.lockoutUntil > Date.now()) {
            const diff = Math.ceil((sec.lockoutUntil - Date.now()) / 1000);
            setLockoutRemaining(diff);
            return;
          } else if (sec.lockoutUntil && sec.lockoutUntil <= Date.now()) {
            // Lockout period expired
            localStorage.removeItem(SECURITY_STORAGE_KEY);
            setLockoutRemaining(0);
          }
        }
      } catch (_) {}
      setLockoutRemaining(0);
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Seed default users if db is empty
    const seedUsers = async () => {
      const count = await db.users.count();
      if (count === 0) {
        const ownerHash = await hashPassword('owner');
        const gudangHash = await hashPassword('gudang');
        const kasirHash = await hashPassword('kasir');
        
        await db.users.bulkAdd([
          {
            id: uuidv4(),
            username: 'owner',
            password_hash: ownerHash,
            role: 'OWNER',
            name: 'Owner',
            phone: '',
            status: 'Aktif'
          },
          {
            id: uuidv4(),
            username: 'gudang',
            password_hash: gudangHash,
            role: 'GUDANG',
            name: 'Petugas Gudang',
            phone: '',
            status: 'Aktif'
          },
          {
            id: uuidv4(),
            username: 'kasir',
            password_hash: kasirHash,
            role: 'KASIR',
            name: 'Kasir',
            phone: '',
            status: 'Aktif'
          }
        ]);
      }
    };
    seedUsers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (lockoutRemaining > 0) {
      setError(`Akses login sedang dikunci. Silakan tunggu ${formatTimer(lockoutRemaining)}.`);
      return;
    }

    if (!username || !password) {
      setError('Username dan Password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const user = await db.users.where('username').equals(username).first();
      
      if (!user) {
        setError('Username tidak ditemukan');
        setLoading(false);
        return;
      }

      if (user.status !== 'Aktif') {
        setError('Akun tidak aktif, silakan hubungi Owner');
        setLoading(false);
        return;
      }

      const hashedInput = await hashPassword(password);
      if (user.password_hash !== hashedInput) {
        // Track failed attempts
        let attempts = 0;
        try {
          const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
          if (raw) {
            const sec = JSON.parse(raw);
            attempts = Number(sec.attempts) || 0;
          }
        } catch (_) {}

        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_TIME_MS;
          localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify({ attempts, lockoutUntil }));
          setLockoutRemaining(Math.ceil(LOCKOUT_TIME_MS / 1000));
          setError(`Terlalu banyak percobaan gagal (${MAX_ATTEMPTS}x). Akses login dikunci selama ${LOCKOUT_MINUTES} menit demi keamanan.`);
        } else {
          localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify({ attempts, lockoutUntil: null }));
          const remainingAttempts = MAX_ATTEMPTS - attempts;
          setError(`Password salah. Sisa kesempatan: ${remainingAttempts}x sebelum akun dikunci.`);
        }

        setLoading(false);
        return;
      }
      
      // Reset failed attempts on successful login
      try {
        localStorage.removeItem(SECURITY_STORAGE_KEY);
      } catch (_) {}

      // Cleanup sensitive data before storing in Zustand
      const userSession = { ...user };
      delete userSession.password_hash;

      loginStore(userSession, 'offline-token');
      
      if (user.role === 'OWNER') {
        navigate('/');
      } else if (user.role === 'GUDANG') {
        navigate('/warehouse');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container login-bg" style={{ alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: '100vh', display: 'flex' }}>
      
      <div className="animate-fade-down" style={{ textAlign: 'center', marginBottom: '32px', zIndex: 1 }}>
        <div style={{ 
          height: '120px', 
          width: '120px', 
          margin: '0 auto 16px auto', 
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: 'white',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <img 
            src="/logo-login.jpg" 
            alt="Sekawan Putri Logo" 
            style={{ 
              height: '100%', 
              width: '100%', 
              objectFit: 'cover',
              transform: 'scale(1.55)'
            }} 
          />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Point of Sale System</p>
      </div>

      <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', borderRadius: '24px', border: '1px solid rgba(229, 231, 235, 0.5)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.9)', zIndex: 1, margin: 0 }}>
        
        {lockoutRemaining > 0 ? (
          <div className="animate-fade-in" style={{ 
            backgroundColor: '#fef2f2', 
            border: '1.5px solid #fca5a5', 
            color: '#991b1b', 
            padding: '16px', 
            borderRadius: '16px', 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '14px', 
            textAlign: 'left' 
          }}>
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#fee2e2', 
              borderRadius: '50%', 
              color: '#dc2626', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Akses Login Dikunci Sementara</div>
              <div style={{ fontSize: '13px', lineHeight: '1.4', color: '#b91c1c' }}>
                Terlalu banyak percobaan gagal. Silakan tunggu <strong>{formatTimer(lockoutRemaining)}</strong>.
              </div>
            </div>
          </div>
        ) : error && (
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '14px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px', marginBottom: '10px' }}>Username</label>
            <div className="input-group">
              <User size={20} className="input-icon" />
              <input 
                type="text" 
                className="form-input" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                disabled={loading || lockoutRemaining > 0}
                required
                style={{ borderRadius: '12px', minHeight: '52px', opacity: lockoutRemaining > 0 ? 0.6 : 1 }}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px', marginBottom: '10px' }}>Password</label>
            <div className="input-group">
              <Lock size={20} className="input-icon" />
              <input 
                type={showPassword ? 'text' : 'password'}
                className="form-input" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || lockoutRemaining > 0}
                required
                style={{ borderRadius: '12px', minHeight: '52px', opacity: lockoutRemaining > 0 ? 0.6 : 1 }}
              />
              <div className="input-group-append" onClick={() => !lockoutRemaining && setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>
          
          <div className="animate-fade-up">
            <button 
              type="submit" 
              className="btn btn-primary btn-block" 
              style={{ 
                minHeight: '56px', 
                fontSize: '16px', 
                fontWeight: '700', 
                borderRadius: '16px',
                background: lockoutRemaining > 0 ? '#94a3b8' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                boxShadow: lockoutRemaining > 0 ? 'none' : '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                display: 'flex',
                gap: '8px',
                cursor: (loading || lockoutRemaining > 0) ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || lockoutRemaining > 0}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Mengautentikasi...</span>
                </>
              ) : lockoutRemaining > 0 ? (
                <>
                  <Clock size={20} />
                  <span>Terkunci ({formatTimer(lockoutRemaining)})</span>
                </>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>
          </div>


        </form>
      </div>
      
      <div className="animate-fade-up" style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <span>&copy; {new Date().getFullYear()} Sekawan Putri. All rights reserved.</span>
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          Powered by 
          <a href="https://www.naikomzet.web.id/" target="_blank" rel="noreferrer" style={{display: 'inline-flex', alignItems: 'center'}}>
            <img src="/naikomzet-logo.png" alt="Naik Omzet" style={{height: '24px', objectFit: 'contain'}} />
          </a>
        </span>
      </div>
    </div>
  );
}
