import React, { useState } from 'react';
import { useAuthStore, usePrinterStore, useCategoryStore, useBillScheduleStore } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, Settings as SettingsIcon, Info, HelpCircle, ChevronRight, Lock, RefreshCw, Printer, Package, Tag, Plus, Trash2, Calendar } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { PageHeader } from '../components/ui';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { config: printerConfig, updateConfig: updatePrinterConfig } = usePrinterStore();
  const navigate = useNavigate();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const { categories, parentMapping = {}, addCategory, removeCategory } = useCategoryStore();
  const { schedules, addSchedule, removeSchedule, updateSchedule } = useBillScheduleStore();
  
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('Kategori A');
  const [newSchedule, setNewSchedule] = useState({ name: '', type: 'Bulanan', day: 1 });

  const handleConfirmLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleConfirmSwitchAccount = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="page-transition">
      <PageHeader
        title="Menu Lainnya"
        subtitle="Akses fitur tambahan dan pengaturan"
        icon={SettingsIcon}
      />

      <div className="card flex items-center gap-4" style={{ marginBottom: '24px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <User size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ textTransform: 'capitalize', fontSize: '18px', marginBottom: '4px' }}>{user?.username}</h3>
          <p style={{ fontSize: '13px' }}>Role: <span className="badge badge-success">{user?.role}</span></p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        {/* KASIR & OWNER MENU */}
        <div 
          style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => setIsProfileModalOpen(true)}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div className="flex items-center gap-3">
            <div style={{ color: 'var(--primary)' }}><User size={20} /></div>
            <span style={{ fontWeight: '500' }}>Profil Saya</span>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>

        {isOwner && (
          <div 
            style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onClick={() => setIsPasswordModalOpen(true)}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div className="flex items-center gap-3">
              <div style={{ color: 'var(--warning)' }}><Lock size={20} /></div>
              <span style={{ fontWeight: '500' }}>Ubah Password</span>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>
        )}

        <div 
          style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isOwner ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => setIsSwitchAccountModalOpen(true)}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div className="flex items-center gap-3">
            <div style={{ color: 'var(--secondary)' }}><RefreshCw size={20} /></div>
            <span style={{ fontWeight: '500' }}>Ganti Akun</span>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>

        {/* OWNER ONLY MENU */}
        {isOwner && (
          <>
            <div 
              style={{ 
                margin: '16px', 
                padding: '20px', 
                backgroundColor: 'var(--primary-light)', 
                borderRadius: '16px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.15)'
              }}
              onClick={() => navigate('/warehouse')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Package size={28} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '18px', fontWeight: '600' }}>Modul Gudang</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Kelola stok, expired, dan restock</p>
                </div>
              </div>
              <ChevronRight size={24} color="var(--primary)" />
            </div>


            <div 
              style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onClick={() => navigate('/employees')}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: 'var(--secondary)' }}><Users size={20} /></div>
                <span style={{ fontWeight: '500' }}>Manajemen Tim</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>

            <div 
              style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onClick={() => setIsCategoryModalOpen(true)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: 'var(--text-muted)' }}><Tag size={20} /></div>
                <span style={{ fontWeight: '500' }}>Manajemen Kategori Produk</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
            
            <div 
              style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onClick={() => setIsScheduleModalOpen(true)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: 'var(--text-muted)' }}><Calendar size={20} /></div>
                <span style={{ fontWeight: '500' }}>Jadwal Pengeluaran Rutin</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
            
            <div 
              style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onClick={() => setIsPrinterModalOpen(true)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--background)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: 'var(--text-muted)' }}><Printer size={20} /></div>
                <span style={{ fontWeight: '500' }}>Konfigurasi Printer</span>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </>
        )}
      </div>

      <div>
        <button className="btn btn-danger btn-block" onClick={() => setIsLogoutModalOpen(true)} style={{ minHeight: '56px', fontSize: '16px' }}>
          <LogOut size={20} style={{ marginRight: '8px' }} /> Keluar (Logout)
        </button>
      </div>

      {/* MODALS */}
      
      {/* Profile Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Profil Saya">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={user?.username} disabled style={{ backgroundColor: 'var(--background)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input type="text" className="form-input" value={user?.name || user?.username} disabled style={{ backgroundColor: 'var(--background)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input type="text" className="form-input" value={user?.role} disabled style={{ backgroundColor: 'var(--background)' }} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setIsProfileModalOpen(false)}>Tutup</button>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Ubah Password">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Password Saat Ini</label>
            <input type="password" className="form-input" placeholder="Masukkan password saat ini" />
          </div>
          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input type="password" className="form-input" placeholder="Masukkan password baru" />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input type="password" className="form-input" placeholder="Ketik ulang password baru" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setIsPasswordModalOpen(false)}>Batal</button>
            <button className="btn btn-primary btn-block" onClick={() => {
              alert('Fitur ubah password akan segera tersedia.');
              setIsPasswordModalOpen(false);
            }}>Simpan</button>
          </div>
        </div>
      </Modal>

      {/* Printer Modal */}
      <Modal isOpen={isPrinterModalOpen} onClose={() => setIsPrinterModalOpen(false)} title="Konfigurasi Printer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Ukuran Kertas</label>
            <CustomSelect 
              value={printerConfig.paperSize} 
              onChange={(val) => updatePrinterConfig({ paperSize: val })}
              options={[
                { value: '58', label: '58 mm (Roll Kecil)' },
                { value: '80', label: '80 mm (Roll Besar)' }
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="showAddress"
                checked={printerConfig.showAddress}
                onChange={(e) => updatePrinterConfig({ showAddress: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="showAddress" style={{ margin: 0, cursor: 'pointer' }}>Cetak Alamat</label>
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="autoPrint"
                checked={printerConfig.autoPrint}
                onChange={(e) => updatePrinterConfig({ autoPrint: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="autoPrint" style={{ margin: 0, cursor: 'pointer' }}>Auto Print</label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Jumlah Copy Struk</label>
            <CustomSelect 
              value={printerConfig.copies.toString()} 
              onChange={(val) => updatePrinterConfig({ copies: parseInt(val) })}
              options={[
                { value: '1', label: '1 Lembar' },
                { value: '2', label: '2 Lembar' },
                { value: '3', label: '3 Lembar' }
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Margin Atas (mm)</label>
              <input 
                type="number" 
                className="form-input" 
                value={printerConfig.marginTop}
                onChange={(e) => updatePrinterConfig({ marginTop: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Margin Bawah (mm)</label>
              <input 
                type="number" 
                className="form-input" 
                value={printerConfig.marginBottom}
                onChange={(e) => updatePrinterConfig({ marginBottom: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ukuran Font</label>
            <CustomSelect 
              value={printerConfig.fontSize} 
              onChange={(val) => updatePrinterConfig({ fontSize: val })}
              options={[
                { value: 'normal', label: 'Normal (Standard)' },
                { value: 'compact', label: 'Compact (Lebih Rapat)' }
              ]}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pesan Penutup (Footer)</label>
            <textarea 
              className="form-input" 
              rows="3"
              value={printerConfig.footerText}
              onChange={(e) => updatePrinterConfig({ footerText: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setIsPrinterModalOpen(false)}>Tutup & Simpan</button>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Manajemen Kategori Produk">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Tambahkan kategori produk baru untuk digunakan di POS dan Gudang.
          </p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nama Kategori..." 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{ width: '150px' }}>
              <CustomSelect
                value={newCategoryParent}
                onChange={setNewCategoryParent}
                options={[
                  { value: 'Kategori A', label: 'Kategori A' },
                  { value: 'Kategori B', label: 'Kategori B' }
                ]}
                searchable={false}
              />
            </div>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0 16px', borderRadius: '12px' }}
              onClick={() => {
                if (newCategory.trim()) {
                  addCategory(newCategory.trim(), newCategoryParent);
                  setNewCategory('');
                }
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          <div style={{ 
            border: '1px solid var(--border)', 
            borderRadius: '12px', 
            overflow: 'hidden',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {categories.map((cat, i) => (
              <div 
                key={i} 
                style={{ 
                  padding: '12px 16px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none',
                  backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)'
                }}
              >
                <div>
                  <span style={{ fontWeight: '500', fontSize: '15px' }}>{cat}</span>
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                    {parentMapping[cat] || 'Kategori A'}
                  </span>
                </div>
                <button 
                  className="btn-icon" 
                  style={{ color: 'var(--danger)' }}
                  onClick={() => removeCategory(cat)}
                  disabled={['Frozen Food', 'Minuman', 'Sembako', 'Sayur', 'Ice Cream', 'Endog'].includes(cat)}
                  title={['Frozen Food', 'Minuman', 'Sembako', 'Sayur', 'Ice Cream', 'Endog'].includes(cat) ? "Kategori bawaan tidak bisa dihapus" : "Hapus Kategori"}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setIsCategoryModalOpen(false)}>Selesai</button>
        </div>
      </Modal>

      {/* Bill Schedule Management Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Jadwal Pengeluaran Rutin" maxWidth="500px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Atur jadwal pembayaran tagihan (Gaji, Wifi, Listrik, dll). Aplikasi akan memberi notifikasi saat tanggal jatuh tempo.
          </p>
          
          <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--surface)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Tambah Jadwal Baru</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Nama Pengeluaran</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Cth: Listrik" 
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Tipe</label>
                <CustomSelect
                  value={newSchedule.type}
                  onChange={(val) => {
                    let newDay = newSchedule.day;
                    if (val === 'Mingguan' && newDay > 7) {
                      newDay = 7;
                    }
                    setNewSchedule({...newSchedule, type: val, day: newDay});
                  }}
                  options={[
                    { value: 'Bulanan', label: 'Bulanan' },
                    { value: 'Mingguan', label: 'Mingguan' }
                  ]}
                  minWidth="100%"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  {newSchedule.type === 'Bulanan' ? 'Tanggal (1-31)' : 'Hari (1=Senin, 7=Minggu)'}
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1" 
                  max={newSchedule.type === 'Bulanan' ? "31" : "7"} 
                  value={newSchedule.day === '' ? '' : newSchedule.day}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setNewSchedule({...newSchedule, day: ''});
                      return;
                    }
                    let val = Number(e.target.value);
                    if (newSchedule.type === 'Mingguan' && val > 7) val = 7;
                    if (newSchedule.type === 'Bulanan' && val > 31) val = 31;
                    setNewSchedule({...newSchedule, day: val});
                  }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0 24px', height: '42px', borderRadius: '12px' }}
                onClick={() => {
                  if (newSchedule.name.trim() && newSchedule.day) {
                    addSchedule({ ...newSchedule, id: Date.now().toString() });
                    setNewSchedule({ name: '', type: 'Bulanan', day: 1 });
                  }
                }}
              >
                Tambah
              </button>
            </div>
          </div>

          <div style={{ 
            border: '1px solid var(--border)', 
            borderRadius: '12px', 
            overflow: 'hidden',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {schedules.map((s, i) => (
              <div 
                key={s.id} 
                style={{ 
                  padding: '12px 16px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: i < schedules.length - 1 ? '1px solid var(--border)' : 'none',
                  backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {s.type === 'Bulanan' 
                      ? `Setiap Tanggal ${s.day}` 
                      : `Setiap Hari ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][(s.day > 7 || s.day < 1 ? 1 : s.day) - 1]} (Mingguan)`}
                  </div>
                </div>
                <button 
                  className="btn-icon" 
                  style={{ color: 'var(--danger)' }}
                  onClick={() => removeSchedule(s.id)}
                  title="Hapus Jadwal"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {schedules.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada jadwal</div>
            )}
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setIsScheduleModalOpen(false)}>Selesai</button>
        </div>
      </Modal>

      {/* Switch Account Confirmation */}
      <Modal isOpen={isSwitchAccountModalOpen} onClose={() => setIsSwitchAccountModalOpen(false)} title="Ganti Akun?">
        <p style={{ marginBottom: '24px' }}>Sesi Anda saat ini akan diakhiri dan aplikasi akan siap digunakan oleh akun lain. Lanjutkan?</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-block" onClick={() => setIsSwitchAccountModalOpen(false)}>Batal</button>
          <button className="btn btn-primary btn-block" onClick={handleConfirmSwitchAccount}>Ganti Akun</button>
        </div>
      </Modal>

      {/* Logout Confirmation */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Keluar dari akun?">
        <p style={{ marginBottom: '24px' }}>Anda harus login kembali untuk masuk ke sistem.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-block" onClick={() => setIsLogoutModalOpen(false)}>Batal</button>
          <button className="btn btn-danger btn-block" onClick={handleConfirmLogout}>Logout</button>
        </div>
      </Modal>

    </div>
  );
}
