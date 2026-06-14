'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Modal from './Modal';
import { seekResponseSchema } from '@/lib/schemas';

interface SeekResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postUser: string;
  onSuccess?: () => void;
}

export default function SeekResponseModal({ isOpen, onClose, postId, postUser, onSuccess }: SeekResponseModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = seekResponseSchema.safeParse({ message });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to respond.');
      setLoading(false);
      return;
    }

    // Check if user already responded
    const { data: existingResponse } = await supabase
      .from('seeking_responses')
      .select('response_id')
      .eq('post_id', postId)
      .eq('responder_id', user.id)
      .maybeSingle();

    if (existingResponse) {
      toast.error('You have already responded to this post.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await supabase.from('seeking_responses').insert({
      post_id: postId,
      responder_id: user.id,
      message: validation.data.message,
      status: 'pending'
    });

    setLoading(false);

    if (submitError) {
      toast.error(submitError.message);
    } else {
      toast.success('Response sent successfully!');
      setMessage('');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Respond to Post">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px', color: 'var(--ink-mid)' }}>
          Responding to: <strong>{postUser}</strong>
        </div>

        <div className="form-group">
          <label>Your Message</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="Hi, I have a room available that fits your requirements..."
            required
            rows={4}
          ></textarea>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !message}>
            {loading ? 'Sending...' : 'Send Response'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
