'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';
import { toast } from 'sonner';
import { z } from 'zod';

const offerSchema = z.object({
  offer_price: z.number().min(1, 'Offer price must be greater than 0'),
  message: z.string().optional()
});

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemTitle: string;
  askingPrice: number;
  onSuccess?: () => void;
}

export default function OfferModal({ isOpen, onClose, itemId, itemTitle, askingPrice, onSuccess }: OfferModalProps) {
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = offerSchema.safeParse({
      offer_price: Number(price),
      message
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to make an offer.');
      setLoading(false);
      return;
    }

    // Check if user already has a pending offer for this item
    const { data: existingOffer } = await supabase
      .from('offers')
      .select('offer_id')
      .eq('item_id', itemId)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'countered'])
      .maybeSingle();

    if (existingOffer) {
      toast.error('You already have an active offer for this item. Please wait for a response or update your existing offer.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await supabase.from('offers').insert({
      item_id: itemId,
      buyer_id: user.id,
      offer_price: validation.data.offer_price,
      message: validation.data.message,
      status: 'pending'
    });

    setLoading(false);

    if (submitError) {
      toast.error(submitError.message);
    } else {
      toast.success('Offer submitted successfully!');
      setPrice('');
      setMessage('');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Make an Offer">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px', color: 'var(--ink-mid)' }}>
          Item: <strong>{itemTitle}</strong>
          <div style={{ marginTop: '4px', fontSize: '14px' }}>Asking Price: ৳{askingPrice.toLocaleString('en-BD')}</div>
        </div>        <div className="form-group">
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
            placeholder="Hi, I am interested in buying this..."
            rows={3}
          ></textarea>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !price}>
            {loading ? 'Sending...' : 'Send Offer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
