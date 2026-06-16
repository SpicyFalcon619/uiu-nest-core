'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateListingStatus, updateItemStatus } from '@/app/actions/applications';
import { Loader2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface StatusChangerProps {
  type: 'listing' | 'item';
  entityId: number;
  currentStatus: string;
}

const LISTING_OPTIONS = [
  { value: 'available',   label: 'Available' },
  { value: 'occupied',    label: 'Occupied' },
  { value: 'soon_vacant', label: 'Soon Vacant' },
];

const ITEM_OPTIONS = [
  { value: 'available',  label: 'Available' },
  { value: 'sold',       label: 'Sold' },
  { value: 'withdrawn',  label: 'Withdrawn' },
];

export default function StatusChanger({ type, entityId, currentStatus }: StatusChangerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const options = type === 'listing' ? LISTING_OPTIONS : ITEM_OPTIONS;

  const handleChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setLoading(true);
    const prev = status;
    setStatus(newStatus);
    const res = type === 'listing'
      ? await updateListingStatus(entityId, newStatus)
      : await updateItemStatus(entityId, newStatus);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      setStatus(prev);
    } else {
      toast.success('Status updated.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--ink-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Status:</span>
      <CustomSelect value={status} onChange={handleChange} options={options} />
      {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-muted)', flexShrink: 0 }} />}
    </div>
  );
}
