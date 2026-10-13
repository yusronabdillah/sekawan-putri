import React from 'react';
import './AppInput.css';

export function AppInput({ 
  label, 
  error, 
  helperText, 
  icon,
  className = '', 
  ...props 
}) {
  return (
    <div className={`app-input-wrapper ${className}`}>
      {label && <label className="app-input-label">{label}</label>}
      <div className="app-input-container">
        {icon && <span className="app-input-icon">{icon}</span>}
        <input 
          className={`app-input ${error ? 'app-input-error' : ''} ${icon ? 'has-icon' : ''}`}
          {...props} 
        />
      </div>
      {(error || helperText) && (
        <span className={`app-input-helper ${error ? 'text-danger' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
