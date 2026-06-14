'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: ModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-bg" 
      style={{ display: 'flex' }}
      onClick={(e) => {
        // Close when clicking outside the modal content
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="card" 
        style={{ 
          width: '100%', 
          maxWidth, 
          maxHeight: '90vh', 
          overflowY: 'auto',
          position: 'relative' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{title}</h2>
          <button 
            onClick={onClose} 
            className="icon-btn" 
            style={{ width: '32px', height: '32px', border: 'none', boxShadow: 'none' }}
          >
            <X size={18} />
          </button>
        </div>
        
        {children}
      </div>
    </div>
  );
}
