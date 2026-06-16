'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MessageIcon() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let channel: any;

    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .neq('sender_id', user.id)
        .eq('is_read', false);
      if (data && isMounted)
        setUnread(new Set(data.map((m: any) => m.conversation_id)).size);
    };

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      await fetchUnread();
      channel = supabase
        .channel(`msg-badge-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          if (isMounted) fetchUnread();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
          if (isMounted) fetchUnread();
        })
        .subscribe();
    };

    init();
    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link className="icon-btn" href="/messages" title="Messages" style={{ position: 'relative' }}>
      <MessageCircle size={20} />
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: 0, right: 0,
          transform: 'translate(35%, -35%)',
          background: '#1A5C45', color: '#fff',
          borderRadius: 10, padding: '1px 5px',
          fontSize: 10, fontWeight: 700, lineHeight: '14px',
          minWidth: 16, textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
