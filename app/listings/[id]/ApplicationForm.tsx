'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { submitApplication } from '@/app/actions/applications';

export default function ApplicationForm({ listingId, ownerId, listingTitle }: { listingId: number; ownerId: string; listingTitle: string }) {
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setApplying(true);

    const res = await submitApplication(listingId, ownerId, listingTitle, message);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Application sent! The owner will be notified.');
      setMessage('');
    }
    setApplying(false);
  };

  return (
    <form onSubmit={handleApply}>
      <textarea
        className="form-control"
        placeholder="Hi, I'm a UIU student interested in renting..."
        style={{ height: '100px', marginBottom: '16px' }}
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
        disabled={applying}
      />
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
        disabled={applying || !message.trim()}
      >
        {applying ? 'Sending...' : <><Send size={18} /> Apply Now</>}
      </button>
    </form>
  );
}
