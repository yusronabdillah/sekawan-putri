import React from 'react';
import './AppBadge.css';

export function AppBadge({ children, variant = 'default', className = '', ...props }) {
  return (
    <span className={`app-badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}
