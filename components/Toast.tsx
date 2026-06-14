'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const ToastContext = createContext<(msg: string, type?: 'success' | 'error' | 'info') => void>(() => {});

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type === 'error' ? 'toast-error' : t.type === 'success' ? 'toast-success' : ''}`}
          >
            {t.type === 'success' && <span>✓</span>}
            {t.type === 'error' && <span>✕</span>}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
