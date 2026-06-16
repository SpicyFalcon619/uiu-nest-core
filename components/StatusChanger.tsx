'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateListingStatus, updateItemStatus } from '@/app/actions/applications';
import { RefreshCw } from 'lucide-react';

interface StatusChangerProps {
  type: 'listing' | 'item';
  entityId: number;
  currentStatus: string;
}

const LISTING_STATUSES = [
  { value: 'available',   label: '✅ Available',     color: '#10b981' },
  { value: 'occupied',    label: '🔴 Occupied',       color: '#ef4444' },
  { value: 'soon_vacant', label: '🟡 Soon Vacant',    color: '#f59e0b' },
];

const ITEM_STATUSES = [
  { value: 'available',  label: '✅ Available',   color: '#10b981' },
  { value: 'sold',       label: '🔴 Sold',         color: '#ef4444' },
  { value: 'withdrawn',  label: '⚪ Withdrawn',    color: '#9ca3af' },
];

export default function StatusChanger({ type, entityId, currentStatus }: StatusChangerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const options = type === 'listing' ? LISTING_STATUSES : ITEM_STATUSES;
  const current = options.find(o => o.value === status);

  const handleChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setLoading(true);
    const prev = status;
    setStatus(newStatus); // optimistic
    const res = type === 'listing'
      ? await updateListingStatus(entityId, newStatus)
      : await updateItemStatus(entityId, newStatus);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      setStatus(prev); // revert
    } else {
      toast.success('Status updated.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: 'var(--ink-muted)', fontWeight: 500 }}>Status:</span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={loading}
            style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${opt.color}`,
              background: status === opt.value ? opt.color : 'transparent',
              color:  status === opt.value ? '#fff' : opt.color,
              transition: 'all 0.15s',
              opacity: loading && status !== opt.value ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {loading && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-muted)' }} />}
    </div>
  );
}
