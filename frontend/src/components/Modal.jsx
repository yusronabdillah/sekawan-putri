import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth, contentStyle }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: maxWidth || '500px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
      >
        <div className="flex justify-between items-center" style={{ padding: '20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '18px', fontWeight: '700' }}>{title}</h2>
          <button className="btn-icon btn-outline" onClick={onClose} style={{ border: 'none', flexShrink: 0, width: '32px', height: '32px' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1, minHeight: 0, ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
