'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { submitRating } from '@/app/actions/ratings';

interface UserRatingProps {
  targetUserId: string;
  initialRating: number;
  totalRatings: number;
  isLoggedIn: boolean;
  currentUserId?: string;
}

export default function UserRating({ targetUserId, initialRating, totalRatings, isLoggedIn, currentUserId }: UserRatingProps) {
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRate = isLoggedIn && currentUserId !== targetUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitRating(targetUserId, rating, review);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Rating submitted successfully!');
      setShowModal(false);
      window.location.reload();
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', cursor: canRate ? 'pointer' : 'default' }}
        onClick={() => canRate && setShowModal(true)}
      >
        <Star size={16} fill="var(--gold)" color="var(--gold)" />
        <span style={{ fontWeight: 600 }}>{initialRating > 0 ? initialRating.toFixed(1) : 'New'}</span>
        <span style={{ color: 'var(--gray)', fontSize: '12px' }}>({totalRatings})</span>
        {canRate && (
          <span style={{ fontSize: '12px', color: 'var(--primary)', marginLeft: '8px' }}>Rate Seller</span>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Rate this Seller</h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star}
                    size={32}
                    fill={star <= rating ? 'var(--gold)' : 'none'}
                    color={star <= rating ? 'var(--gold)' : 'var(--gray)'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>

              <div className="form-group">
                <label>Write a Review (Optional)</label>
                <textarea 
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="input" 
                  rows={3}
                  placeholder="How was your experience?"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline btn-block" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
