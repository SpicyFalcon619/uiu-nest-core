'use client';

import { useState } from 'react';
import Modal from './Modal';
import { toast } from 'sonner';
import { submitOfferAction } from '@/app/actions/offers';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemTitle: string;
  sellerId: string;
  askingPrice: number;
  onSuccess?: () => void;
}

export default function OfferModal({ isOpen, onClose, itemId, itemTitle, sellerId, askingPrice, onSuccess }: OfferModalProps) {
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!numPrice || numPrice < 1) {
      toast.error('Enter a valid offer price.');
      return;
    }
    setLoading(true);

    const res = await submitOfferAction(itemId, sellerId, itemTitle, numPrice, message || undefined);

    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Offer sent! The seller will be notified.');
      setPrice('');
      setMessage('');
      onSuccess?.();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Make an Offer">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px', color: 'var(--ink-mid)' }}>
          Item: <strong>{itemTitle}</strong>
          <div style={{ marginTop: '4px', fontSize: '14px' }}>Asking Price: ৳{askingPrice.toLocaleString('en-BD')}</div>
        </div>

        <div className="form-group">
          <label>Your Offer (৳)</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 1500"
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Message to Seller (Optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Hi, I'm interested in buying this..."
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading || !price}>
            {loading ? 'Sending...' : 'Send Offer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
