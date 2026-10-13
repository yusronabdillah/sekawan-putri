import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './AppDatePicker.css';

export function AppDatePicker({ 
  value, 
  onChange, 
  label, 
  error, 
  helperText, 
  placeholder = "Pilih Tanggal",
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 350; // Approx height of DayPicker
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPos = rect.bottom + window.scrollY + 8;
      
      // If not enough space below but enough space above, position it above
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        topPos = rect.top + window.scrollY - popoverHeight - 8;
      }
      
      setPopoverStyle({
        position: 'absolute',
        top: topPos,
        left: rect.left + window.scrollX,
        zIndex: 99999,
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
      updatePosition();
      window.addEventListener('resize', updatePosition);
      
      // Update position on scroll instead of closing it immediately
      const handleScroll = (e) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target) && !containerRef.current.contains(e.target)) {
          updatePosition();
        }
      };
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', handleScroll, { capture: true });
      };
    }
  }, [isOpen, updatePosition]);

  const handleSelect = (date) => {
    if (date) {
      // Return YYYY-MM-DD
      const formatted = format(date, 'yyyy-MM-dd');
      onChange(formatted);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const displayValue = value ? format(new Date(value), 'dd MMMM yyyy', { locale: id }) : '';

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
          <div className="app-datepicker-popover" ref={popoverRef} style={popoverStyle}>
            <DayPicker 
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={handleSelect}
              locale={id}
              showOutsideDays
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
            />
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
