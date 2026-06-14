'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingTitle: string;
  onSuccess?: () => void;
}

export default function ApplicationModal({ isOpen, onClose, listingId, listingTitle, onSuccess }: ApplicationModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to apply.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await supabase.from('applications').insert({
      listing_id: listingId,
      applicant_id: user.id,
      message: message,
      status: 'pending'
    });

    setLoading(false);

    if (submitError) {
      setError(submitError.message);
    } else {
      setMessage('');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Listing">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px', color: 'var(--ink-mid)' }}>
          Applying for: <strong>{listingTitle}</strong>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

        <div className="form-group">
          <label>Message to Landlord</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="Tell the landlord a bit about yourself..."
            rows={4}
            required
          ></textarea>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !message}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
