import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import '../ui/AppDatePicker/AppDatePicker.css';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function AppMonthPicker({ 
  value, 
  onChange, 
  label, 
  error, 
  helperText, 
  placeholder = "Pilih Bulan & Tahun",
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});

  // internal state for the popover UI
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      const [y] = value.split('-');
      return parseInt(y, 10);
    }
    return new Date().getFullYear();
  });

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 320; 
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPos = rect.bottom + window.scrollY + 8;
      
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        topPos = rect.top + window.scrollY - popoverHeight - 8;
      }
      
      setPopoverStyle({
        position: 'absolute',
        top: topPos,
        left: rect.left + window.scrollX,
        zIndex: 99999,
        width: '280px', // fixed width for the month picker
      });
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleSelectMonth = (monthIndex) => {
    const y = currentYear;
    const m = monthIndex + 1;
    // Calculate the last day of the selected month
    const lastDay = new Date(y, m, 0).getDate();
    
    // Format to YYYY-MM-DD
    const formattedDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const displayValue = value ? (() => {
    const [y, m] = value.split('-');
    const monthName = MONTHS[parseInt(m, 10) - 1];
    return `${monthName} ${y}`;
  })() : '';

  return (
    <div className={`app-datepicker-wrapper ${className}`}>
      {label && <label className="app-datepicker-label">{label}</label>}
      <div className="app-datepicker-container" ref={containerRef}>
        <button 
          type="button" 
          className={`app-datepicker-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="trigger-content">
            <CalendarIcon size={18} className="calendar-icon" />
            <span className={displayValue ? "selected-text" : "placeholder-text"}>
              {displayValue || placeholder}
            </span>
          </div>
        </button>

        {isOpen && createPortal(
          <div className="app-datepicker-popover" ref={popoverRef} style={{...popoverStyle, padding: '16px', borderRadius: '16px', background: 'white', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', border: '1px solid var(--border)'}}>
            
            {/* Year Navigator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button 
                type="button"
                onClick={() => setCurrentYear(y => y - 1)}
                style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronLeft size={20} color="var(--text-main)" />
              </button>
              <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-main)' }}>
                {currentYear}
              </div>
              <button 
                type="button"
                onClick={() => setCurrentYear(y => y + 1)}
                style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronRight size={20} color="var(--text-main)" />
              </button>
            </div>

            {/* Months Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {MONTHS.map((monthName, idx) => {
                const isSelected = value && parseInt(value.split('-')[0], 10) === currentYear && parseInt(value.split('-')[1], 10) === idx + 1;
                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-main)',
                      fontWeight: isSelected ? '600' : '500',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--background)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {monthName.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            
          </div>,
          document.body
        )}
      </div>
      {(error || helperText) && (
        <span className={`app-datepicker-helper ${error ? 'text-danger' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
