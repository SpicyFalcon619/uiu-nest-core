'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: number;
  againstUserId?: string;
  contextTitle: string;
  onSuccess?: () => void;
}

export default function ComplaintModal({ isOpen, onClose, listingId, againstUserId, contextTitle, onSuccess }: ComplaintModalProps) {
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to file a complaint.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await supabase.from('complaints').insert({
      complainant_id: user.id,
      against_user_id: againstUserId || null,
      listing_id: listingId || null,
      category,
      description,
      status: 'submitted'
    });

    setLoading(false);

    if (submitError) {
      setError(submitError.message);
    } else {
      setCategory('other');
      setDescription('');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File a Complaint">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px', color: 'var(--ink-mid)' }}>
          Against: <strong>{contextTitle}</strong>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

        <div className="form-group">
          <label>Category</label>
          <div className="custom-select-wrapper">
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              required
            >
              <option value="misrepresentation">Misrepresentation / Fake Listing</option>
              <option value="hidden_costs">Hidden Costs</option>
              <option value="harassment">Harassment / Bad Behavior</option>
              <option value="deposit_not_returned">Deposit Not Returned</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Please provide details about your complaint..."
            rows={4}
            required
          ></textarea>
        </div>

        {/* Note: Document upload omitted for brevity, can be added later using supabase storage */}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={loading || !description}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
