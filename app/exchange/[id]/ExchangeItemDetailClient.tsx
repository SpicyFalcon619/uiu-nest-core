'use client';

import { useState } from 'react';
import Link from 'next/link';
import OfferModal from '@/components/modals/OfferModal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface ExchangeItemDetailClientProps {
  itemId: number;
  itemTitle: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  status: string;
  askingPrice: number;
}

export default function ExchangeItemDetailClient({ itemId, itemTitle, isLoggedIn, isOwner, status, askingPrice }: ExchangeItemDetailClientProps) {
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkSold = async () => {
    if (!confirm('Are you sure you want to mark this item as sold?')) return;
    
    setLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('items')
      .update({ status: 'sold' })
      .eq('item_id', itemId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Item marked as sold!');
      router.refresh();
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this item? It will no longer be visible to others.')) return;
    
    setLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('items')
      .update({ status: 'withdrawn' })
      .eq('item_id', itemId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Item withdrawn successfully.');
      router.refresh();
    }
    setLoading(false);
  };

  if (status !== 'available') {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center', fontWeight: 500 }}>
        This item is currently {status}.
      </div>
    );
  }

  return (
    <>
      {isOwner ? (
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary btn-block" onClick={handleMarkSold} disabled={loading}>
            Mark as Sold
          </button>
          <button className="btn btn-outline btn-block" onClick={handleWithdraw} disabled={loading}>
            Withdraw Item
          </button>
        </div>
      ) : isLoggedIn ? (
        <button className="btn btn-primary btn-block" onClick={() => setOfferModalOpen(true)}>
          Make an Offer
        </button>
      ) : (
        <Link href="/login" className="btn btn-primary btn-block" style={{ textAlign: 'center', textDecoration: 'none' }}>
          Log in to Make an Offer
        </Link>
      )}

      <OfferModal 
        isOpen={offerModalOpen} 
        onClose={() => setOfferModalOpen(false)} 
        itemId={itemId}
        itemTitle={itemTitle}
        askingPrice={askingPrice}
      />
    </>
  );
}
