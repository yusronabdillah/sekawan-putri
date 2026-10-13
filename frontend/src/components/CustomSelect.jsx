import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, AlertCircle } from 'lucide-react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Pilih salah satu...",
  searchable = true,
  disabled = false,
  dropdownPosition = 'bottom',
  portal = false,
  minWidth,
  width
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If portal is true, we must also check if they clicked inside the portal
      // The easiest way is to give the dropdown a unique class or just close it if clicking outside the button
      if (containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.custom-select-dropdown')) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = (e) => {
      // Don't close if they are scrolling the dropdown itself
      if (e.target.closest && e.target.closest('.custom-select-dropdown')) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      if (portal) {
        window.addEventListener('scroll', handleScroll, true);
        if (containerRef.current) {
          setRect(containerRef.current.getBoundingClientRect());
        }
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (portal) window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, portal]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 50);
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerQuery) || 
      (opt.barcode && opt.barcode.toLowerCase().includes(lowerQuery))
    );
  }, [options, searchQuery, searchable]);

  // Handle Keyboard Navigation
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
    <div 
      className={`custom-select-container ${disabled ? 'disabled' : ''}`} 
      ref={containerRef} 
      onKeyDown={handleKeyDown}
      style={{ minWidth: minWidth, width: width }}
    >
      <button 
        type="button" 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? "selected-text" : "placeholder-text"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className="chevron-icon" />
      </button>

      {isOpen && (!portal || rect) && (portal ? createPortal(
        <div 
          className={`custom-select-dropdown ${dropdownPosition === 'top' ? 'animate-fade-up' : 'animate-fade-down'}`} 
          style={{ 
            width: rect ? rect.width : '100%', 
            position: 'fixed',
            left: rect ? rect.left : 0,
            zIndex: 9999,
            ...(dropdownPosition === 'top' ? { bottom: window.innerHeight - (rect ? rect.top : 0) + 4, top: 'auto' } : { top: (rect ? rect.bottom : 0) + 4, bottom: 'auto' }) 
          }}
        >
          
          {searchable && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari..." 
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent' }}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: searchable ? '240px' : '300px', padding: '4px 0' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.value}
                  className={`custom-select-option ${value === opt.value ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="option-label" style={{ fontWeight: value === opt.value ? '600' : '500', color: 'var(--text-main)', fontSize: '14px' }}>
                        {opt.label}
                      </span>
                      {value === opt.value && <Check size={16} className="check-icon" color="var(--primary)" />}
                    </div>
                    
                    {(opt.sku !== undefined || opt.stock !== undefined || opt.active_batches !== undefined) && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: '8px 12px', 
                        fontSize: '12px', 
                        color: 'var(--text-muted)',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        marginTop: '2px'
                      }}>
                        {opt.barcode && <span>Barcode: <strong style={{color: 'var(--text-main)'}}>{opt.barcode}</strong></span>}
                        {opt.stock !== undefined && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Stok: <strong style={{color: 'var(--text-main)'}}>{opt.stock}</strong> 
                            {(opt.stock <= (opt.min_stock || 0)) && <AlertCircle size={12} color="var(--danger)" />}
                          </span>
                        )}
                        {opt.active_batches !== undefined && (
                          <span>Batch Aktif: <strong style={{color: 'var(--text-main)'}}>{opt.active_batches}</strong></span>
                        )}
                        {opt.closest_exp && (
                          <span style={{ width: '100%' }}>
                            Expired Terdekat: <strong style={{color: 'var(--text-main)'}}>{opt.closest_exp}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      ) : (
        <div 
          className={`custom-select-dropdown ${dropdownPosition === 'top' ? 'animate-fade-up' : 'animate-fade-down'}`} 
          style={{ 
            width: '100%', 
            ...(dropdownPosition === 'top' ? { bottom: '100%', top: 'auto', marginBottom: '4px' } : {}) 
          }}
        >
          
          {searchable && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari..." 
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent' }}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: searchable ? '240px' : '300px', padding: '4px 0' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.value}
                  className={`custom-select-option ${value === opt.value ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="option-label" style={{ fontWeight: value === opt.value ? '600' : '500', color: 'var(--text-main)', fontSize: '14px' }}>
                        {opt.label}
                      </span>
                      {value === opt.value && <Check size={16} className="check-icon" color="var(--primary)" />}
                    </div>
                    
                    {(opt.sku !== undefined || opt.stock !== undefined || opt.active_batches !== undefined) && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: '8px 12px', 
                        fontSize: '12px', 
                        color: 'var(--text-muted)',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        marginTop: '2px'
                      }}>
                        {opt.barcode && <span>Barcode: <strong style={{color: 'var(--text-main)'}}>{opt.barcode}</strong></span>}
                        {opt.stock !== undefined && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Stok: <strong style={{color: 'var(--text-main)'}}>{opt.stock}</strong> 
                            {(opt.stock <= (opt.min_stock || 0)) && <AlertCircle size={12} color="var(--danger)" />}
                          </span>
                        )}
                        {opt.active_batches !== undefined && (
                          <span>Batch Aktif: <strong style={{color: 'var(--text-main)'}}>{opt.active_batches}</strong></span>
                        )}
                        {opt.closest_exp && (
                          <span style={{ width: '100%' }}>
                            Expired Terdekat: <strong style={{color: 'var(--text-main)'}}>{opt.closest_exp}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
