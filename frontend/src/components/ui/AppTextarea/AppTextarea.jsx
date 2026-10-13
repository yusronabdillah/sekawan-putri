import React, { useRef, useEffect } from 'react';
import './AppTextarea.css';

export function AppTextarea({ 
  label, 
  error, 
  helperText, 
  className = '', 
  autoResize = true,
  ...props 
}) {
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    if (props.onInput) {
      props.onInput(e);
    }
  };

  useEffect(() => {
    if (autoResize && textareaRef.current && props.value) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.value, autoResize]);

  return (
    <div className={`app-textarea-wrapper ${className}`}>
      {label && <label className="app-textarea-label">{label}</label>}
      <textarea 
        ref={textareaRef}
        className={`app-textarea ${error ? 'app-textarea-error' : ''}`}
        onInput={handleInput}
        {...props} 
      />
      {(error || helperText) && (
        <span className={`app-textarea-helper ${error ? 'text-danger' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
