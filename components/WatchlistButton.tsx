'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function WatchlistButton({ 
  listingId, 
  initialIsWatched 
}: { 
  listingId: number; 
  initialIsWatched: boolean;
}) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [loading, setLoading] = useState(false);

  const toggleWatchlist = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to save listings.');
      setLoading(false);
      return;
    }

    if (isWatched) {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);

      if (error) toast.error('Failed to remove from watchlist');
      else {
        setIsWatched(false);
        toast.success('Removed from watchlist');
      }
    } else {
      const { error } = await supabase
        .from('watchlists')
        .insert({ user_id: user.id, listing_id: listingId });

      if (error) toast.error('Failed to add to watchlist');
      else {
        setIsWatched(true);
        toast.success('Added to watchlist');
      }
    }
    setLoading(false);
  };

  return (
    <button 
      className={`btn ${isWatched ? 'btn-primary' : 'btn-outline'}`}
      onClick={toggleWatchlist}
      disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      <Bookmark size={18} fill={isWatched ? 'currentColor' : 'none'} />
      {isWatched ? 'Saved' : 'Save'}
    </button>
  );
}
