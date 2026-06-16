'use client';

import { useState } from 'react';
import Link from 'next/link';
import OfferModal from '@/components/modals/OfferModal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ExchangeItemDetailClientProps {
  itemId: number;
  itemTitle: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  status: string;
  askingPrice: number;
}

export default function ExchangeItemDetailClient({
  itemId,
  itemTitle,
  isLoggedIn,
  isOwner,
  isAdmin,
  status,
  askingPrice,
}: ExchangeItemDetailClientProps) {
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);

  const handleMarkSold = async () => {
    if (!confirm('Are you sure you want to mark this item as sold?')) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('items').update({ status: 'sold' }).eq('item_id', itemId);
    if (error) { toast.error(error.message); } else { toast.success('Item marked as sold!'); setLocalStatus('sold'); }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!confirm('Withdraw this item? It will no longer be visible to others.')) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('items').update({ status: 'withdrawn' }).eq('item_id', itemId);
    if (error) { toast.error(error.message); } else { toast.success('Item withdrawn.'); setLocalStatus('withdrawn'); }
    setLoading(false);
  };

  // Admin force-remove (sets status to withdrawn but is labelled differently for clarity)
  const handleAdminRemove = async () => {
    if (!confirm('Remove this item as admin? It will be marked withdrawn.')) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('items').update({ status: 'withdrawn' }).eq('item_id', itemId);
    if (error) { toast.error(error.message); } else { toast.success('Item removed by admin.'); setLocalStatus('withdrawn'); }
    setLoading(false);
  };

  if (localStatus !== 'available') {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center', fontWeight: 500 }}>
        This item is currently <strong>{localStatus}</strong>.
        {isAdmin && localStatus === 'withdrawn' && (
          <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Item has been withdrawn and is no longer visible to buyers.
          </div>
        )}
      </div>
    );
  }

  // Admin view — can remove the listing but cannot make an offer or act as seller
  if (isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '12px 16px', background: 'var(--surface-1)', borderRadius: '8px', fontSize: '13px', color: 'var(--ink-muted)', textAlign: 'center' }}>
          You are viewing this item as an admin.
        </div>
        <button
          className="btn btn-outline btn-block"
          style={{ borderColor: 'var(--danger, #be3d2f)', color: 'var(--danger, #be3d2f)' }}
          onClick={handleAdminRemove}
          disabled={loading}
        >
          Admin: Remove This Item
        </button>
      </div>
    );
  }

  // Owner view
  if (isOwner) {
    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        <button className="btn btn-primary btn-block" onClick={handleMarkSold} disabled={loading}>
          Mark as Sold
        </button>
        <button className="btn btn-outline btn-block" onClick={handleWithdraw} disabled={loading}>
          Withdraw Item
        </button>
      </div>
    );
  }

  // Buyer view
  if (isLoggedIn) {
    return (
      <>
        <button className="btn btn-primary btn-block" onClick={() => setOfferModalOpen(true)}>
          Make an Offer
        </button>
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

  return (
    <Link href="/login" className="btn btn-primary btn-block" style={{ textAlign: 'center', textDecoration: 'none' }}>
      Log in to Make an Offer
    </Link>
  );
}
