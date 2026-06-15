'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  name?: string;
}

export default function CustomSelect({ value, onChange, options, className = '', name }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const longestLabel = [...options].sort((a, b) => b.label.length - a.label.length)[0]?.label || '';

  return (
    <div className={`custom-select-wrapper ${className}`} ref={wrapperRef} data-longest={longestLabel}>
      <select 
        className="custom-select-hidden" 
        name={name}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={16} style={{ stroke: 'var(--ink-muted)', transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: 8, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      <div className={`custom-select-options ${isOpen ? 'open' : ''}`}>
        {options.map((opt) => (
          <div 
            key={opt.value} 
            className={`custom-option ${opt.value === value ? 'selected' : ''}`}
            onClick={() => {
              onChange(opt.value);
              setIsOpen(false);
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
