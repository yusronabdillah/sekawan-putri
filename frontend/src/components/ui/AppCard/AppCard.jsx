import React from 'react';
import './AppCard.css';

export function AppCard({ children, className = '', padding = '24px', style = {}, ...props }) {
  return (
    <div 
      className={`app-card ${className}`} 
      style={{ padding, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
