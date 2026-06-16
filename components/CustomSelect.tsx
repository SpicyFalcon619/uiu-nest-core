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
  const [isOpen, setIsOpen]       = useState(false);
  const [dropPos, setDropPos]     = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const longestLabel   = [...options].sort((a, b) => b.label.length - a.label.length)[0]?.label || '';

  // Recalculate drop position whenever opening
  const open = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const toggle = () => isOpen ? close() : open();

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      if (optionsRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onScroll = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropPos(prev => prev ? { ...prev, top: rect.bottom + 4, left: rect.left } : prev);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen]);

  return (
    <div className={`custom-select-wrapper ${className}`} ref={wrapperRef} data-longest={longestLabel}>
      {/* Hidden native select for form semantics */}
      <select
        className="custom-select-hidden"
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Visible trigger */}
      <div
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggle}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          size={16}
          style={{ stroke: 'var(--ink-muted)', transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: 8, transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
      </div>

      {/* Dropdown — rendered at fixed position so it escapes overflow:hidden parents */}
      {isOpen && dropPos && (
        <div
          ref={optionsRef}
          className="custom-select-options open"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, zIndex: 99999 }}
        >
          {options.map(o => (
            <div
              key={o.value}
              className={`custom-option ${o.value === value ? 'selected' : ''}`}
              onMouseDown={e => {
                e.preventDefault(); // prevent blur before click registers
                onChange(o.value);
                close();
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
