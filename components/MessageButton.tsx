'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getOrCreateConversation } from '@/app/actions/messages';

interface MessageButtonProps {
  otherUserId: string;
  listingId?: number;
  itemId?: number;
  label?: string;
  className?: string;
}

export default function MessageButton({ otherUserId, listingId, itemId, label = 'Message', className = 'btn btn-outline btn-block' }: MessageButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    const res = await getOrCreateConversation(otherUserId, listingId ?? null, itemId ?? null);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      router.push(`/messages?convo=${res.conversationId}`);
    }
  };

  return (
    <button className={className} onClick={handleClick} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <MessageCircle size={16} />
      {loading ? 'Opening…' : label}
    </button>
  );
}
