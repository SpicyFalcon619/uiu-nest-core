'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ApplicationForm({ listingId, ownerId, listingTitle }: { listingId: number, ownerId: string, listingTitle: string }) {
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to apply.');
      setApplying(false);
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert({
        listing_id: listingId,
        applicant_id: user.id,
        message,
        status: 'pending'
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Application sent successfully!');
      setMessage('');
      
      // Send notification to owner
      await supabase.from('notifications').insert({
        user_id: ownerId,
        type: 'application',
        message: `You received a new application for ${listingTitle}`,
        link: `/dashboard?tab=applications`
      });
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
      />
      <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={applying}>
        {applying ? 'Sending...' : <><Send size={18}/> Apply Now</>}
      </button>
    </form>
  );
}
