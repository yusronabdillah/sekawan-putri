import React from 'react';
import './AppButton.css';
import { Loader2 } from 'lucide-react';

export function AppButton({ 
  children, 
  variant = 'primary', 
  loading = false, 
  disabled = false, 
  className = '', 
  icon,
  ...props 
}) {
  return (
    <button 
      className={`app-btn btn-${variant} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : icon && <span className="mr-2 flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
