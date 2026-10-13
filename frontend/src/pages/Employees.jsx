import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Plus, Edit2, Trash2, Search, X, Users, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/hash';
import { useAuthStore } from '../store/store';
import { PageHeader } from '../components/ui';

export default function Employees() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', username: '', name: '', phone: '', role: 'KASIR', status: 'Aktif', password: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    const data = await db.users.toArray();
    setEmployees(data);
    setIsLoading(false);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ id: '', username: '', name: '', phone: '', role: 'KASIR', status: 'Aktif', password: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setIsEditMode(true);
    setFormData({ ...emp, password: '' }); // keep password empty, only hash if typed
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        const existing = await db.users.get(formData.id);
        if (!existing) throw new Error('User tidak ditemukan');
        
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          username: formData.username
        };
        
        // If password is typed, update hash
        if (formData.password) {
          updateData.password_hash = await hashPassword(formData.password);
        }
        
        await db.users.update(formData.id, updateData);
      } else {
        if (!formData.password) throw new Error('Password wajib diisi untuk pengguna baru');
        
        const checkUsername = await db.users.where('username').equals(formData.username).first();
        if (checkUsername) throw new Error('Username sudah digunakan');

        const passHash = await hashPassword(formData.password);
        
        await db.users.add({
          id: uuidv4(),
          username: formData.username,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          password_hash: passHash
        });
      }
      setIsModalOpen(false);
      loadEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (emp) => {
    if (emp.id === user.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }
    
    if (window.confirm(`Yakin ingin menghapus ${emp.name}?`)) {
      await db.users.delete(emp.id);
      loadEmployees();
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader 
        title="Manajemen Karyawan"
        subtitle="Atur hak akses dan akun kasir"
        icon={Users}
        actions={
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} style={{ marginRight: '8px' }} /> Karyawan Baru
          </button>
        }
      />

      <div className="search-bar" style={{ marginBottom: '24px' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Cari nama atau username..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <X size={20} color="var(--text-muted)" onClick={() => setSearch('')} style={{cursor:'pointer'}}/>}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px' }}>
              <th style={{ padding: '16px' }}>Nama</th>
              <th style={{ padding: '16px' }}>Username</th>
              <th style={{ padding: '16px' }}>Role</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
                  <div>Memuat data karyawan...</div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Belum ada data karyawan</td></tr>
            ) : filteredEmployees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                <td style={{ padding: '16px', fontWeight: '600' }}>
                  {emp.name}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>{emp.phone || '-'}</div>
                </td>
                <td style={{ padding: '16px' }}>{emp.username}</td>
                <td style={{ padding: '16px' }}>
                  <span className="badge" style={{ backgroundColor: emp.role === 'OWNER' ? 'var(--primary-light)' : (emp.role === 'GUDANG' ? 'var(--secondary-light)' : 'var(--background)'), color: emp.role === 'OWNER' ? 'var(--primary)' : (emp.role === 'GUDANG' ? 'var(--secondary)' : 'var(--text-muted)') }}>
                    {emp.role}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span className="badge" style={{ backgroundColor: emp.status === 'Aktif' ? 'var(--secondary-light)' : 'var(--danger-light)', color: emp.status === 'Aktif' ? 'var(--secondary)' : 'var(--danger)' }}>
                    {emp.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div className="flex justify-end gap-2">
                    <button className="btn-icon btn-outline" onClick={() => handleOpenEdit(emp)}><Edit2 size={16} /></button>
                    {emp.id !== user.id && (
                      <button className="btn-icon btn-outline" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(emp)}><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={isEditMode} />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor HP (Opsional)</label>
              <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <CustomSelect 
                value={formData.role} 
                onChange={val => setFormData({...formData, role: val})}
                options={[
                  { value: 'KASIR', label: 'Kasir (Karyawan)' },
                  { value: 'GUDANG', label: 'Gudang' },
                  { value: 'OWNER', label: 'Owner' }
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect 
                value={formData.status} 
                onChange={val => setFormData({...formData, status: val})}
                options={[
                  { value: 'Aktif', label: 'Aktif' },
                  { value: 'Nonaktif', label: 'Nonaktif' }
                ]}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password {isEditMode ? '(Isi jika ingin diubah)' : ''}</label>
            <input type="password" className="form-input" required={!isEditMode} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '24px' }}>
            Simpan Data
          </button>
        </form>
      </Modal>
    </div>
  );
}
