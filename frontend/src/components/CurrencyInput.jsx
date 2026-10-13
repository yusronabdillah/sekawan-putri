import React from 'react';

export default function CurrencyInput({ value, onChange, placeholder, required = false, className = "form-input" }) {
  const displayValue = value ? Number(value).toLocaleString('id-ID') : '';

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = rawValue ? parseInt(rawValue, 10) : '';
    if (onChange) {
      onChange(numValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
    />
  );
}
