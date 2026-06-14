'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingTitle: string;
  onSuccess?: () => void;
}

export default function ReviewModal({ isOpen, onClose, listingId, listingTitle, onSuccess }: ReviewModalProps) {
  const [scores, setScores] = useState({
    value_for_money: 5,
    listing_accuracy: 5,
    landlord_response: 5,
    cleanliness: 5,
    safety: 5
  });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof scores, val: number) => {
    setScores(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to review.');
      setLoading(false);
      return;
    }

    const composite_score = (
      scores.value_for_money + 
      scores.listing_accuracy + 
      scores.landlord_response + 
      scores.cleanliness + 
      scores.safety
    ) / 5;

    const { error: submitError } = await supabase.from('reviews').insert({
      listing_id: listingId,
      reviewer_id: user.id,
      ...scores,
      composite_score,
      comment
    });

    setLoading(false);

    if (submitError) {
      if (submitError.code === '23505') { // unique violation
        setError('You have already reviewed this listing.');
      } else {
        setError(submitError.message);
      }
    } else {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const renderStars = (field: keyof typeof scores, label: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <label style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>{label}</label>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => handleChange(field, star)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', padding: 0, 
              color: star <= scores[field] ? '#EAB308' : '#CBD5E1'
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Listing">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px', color: 'var(--ink-mid)' }}>
          Reviewing: <strong>{listingTitle}</strong>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

        <div style={{ marginBottom: '24px' }}>
          {renderStars('value_for_money', 'Value for Money')}
          {renderStars('listing_accuracy', 'Listing Accuracy')}
          {renderStars('landlord_response', 'Landlord Response')}
          {renderStars('cleanliness', 'Cleanliness')}
          {renderStars('safety', 'Safety')}
        </div>

        <div className="form-group">
          <label>Comment (Optional)</label>
          <textarea 
            value={comment} 
            onChange={e => setComment(e.target.value)} 
            placeholder="Share your experience..."
            rows={3}
          ></textarea>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
