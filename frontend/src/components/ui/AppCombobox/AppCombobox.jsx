import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, AlertCircle } from 'lucide-react';
import './AppCombobox.css';

export function AppCombobox({ 
  value, 
  onChange, 
  options, 
  placeholder = "Pilih salah satu...",
  searchable = true,
  disabled = false,
  label,
  error,
  helperText,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerQuery)
    );
  }, [options, searchQuery, searchable]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!disabled) setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`app-combobox-wrapper ${className}`}>
      {label && <label className="app-combobox-label">{label}</label>}
      
      <div 
        className={`app-combobox-container ${disabled ? 'disabled' : ''}`} 
        ref={containerRef} 
        onKeyDown={handleKeyDown}
      >
        <button 
          type="button" 
          className={`app-combobox-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }}
          disabled={disabled}
        >
          <span className={selectedOption ? "selected-text" : "placeholder-text"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown size={18} className="chevron-icon" />
        </button>

        {isOpen && (
          <div className="app-combobox-inline-panel">
            {searchable && (
              <div className="app-combobox-search-container">
                <Search size={16} color="var(--text-muted)" className="search-icon" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  className="app-combobox-search-input"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Cari..." 
                />
              </div>
            )}

            <div className="app-combobox-list-container">
              {filteredOptions.length === 0 ? (
                <div className="app-combobox-empty-state">
                  Tidak ada hasil ditemukan
                </div>
              ) : (
                filteredOptions.map((opt, index) => (
                  <div
                    key={opt.value}
                    className={`app-combobox-option-item ${value === opt.value ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className="option-main-row">
                      <span className="option-name">{opt.label}</span>
                      {value === opt.value && <Check size={18} color="var(--primary)" />}
                    </div>
                    
                    {/* Vertical Robust Layout for Details */}
                    <div className="option-details-list">
                      <div className="detail-row">
                        <span className="detail-label">Stok Total</span>
                        <span className="detail-value stock-value">
                          {opt.stock !== undefined ? opt.stock : '-'}
                          {opt.stock !== undefined && opt.stock <= (opt.min_stock || 0) && (
                            <AlertCircle size={14} color="var(--danger)" style={{ marginLeft: '4px' }} />
                          )}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Batch Aktif</span>
                        <span className="detail-value">{opt.active_batches !== undefined ? opt.active_batches : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {(error || helperText) && (
        <span className={`app-combobox-helper-text ${error ? 'error-text' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
