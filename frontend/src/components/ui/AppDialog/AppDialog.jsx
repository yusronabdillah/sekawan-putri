import React, { useEffect } from 'react';
import './AppDialog.css';
import { X } from 'lucide-react';

export function AppDialog({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = '500px'
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="app-dialog-overlay" onClick={onClose}>
      <div 
        className="app-dialog-content" 
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-dialog-header">
          <h2 className="app-dialog-title">{title}</h2>
          <button className="app-dialog-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="app-dialog-body">
          {children}
        </div>

        {footer && (
          <div className="app-dialog-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
