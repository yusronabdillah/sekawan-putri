import React from 'react';
import './AppEmptyState.css';

export function AppEmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = '' 
}) {
  return (
    <div className={`app-empty-state ${className}`}>
      {icon && (
        <div className="app-empty-icon-wrapper">
          {icon}
        </div>
      )}
      <h3 className="app-empty-title">{title}</h3>
      {description && <p className="app-empty-desc">{description}</p>}
      {action && (
        <div className="app-empty-action">
          {action}
        </div>
      )}
    </div>
  );
}
