'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const supabase = createClient();
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (data) {
      setNotifications(data);
      setUnread(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setOpen(!open);
    if (!open && unread > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnread(0);
        // Refresh after short delay
        setTimeout(fetchNotifs, 1000);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button 
        onClick={handleOpen}
        style={{ 
          background: 'none', border: 'none', cursor: 'pointer', 
          color: 'var(--ink)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', padding: '8px', borderRadius: '50%'
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4, 
            background: 'var(--danger)', color: 'white', 
            fontSize: 10, fontWeight: 'bold', 
            borderRadius: '10px', padding: '2px 6px'
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          width: 320, maxHeight: 400, overflowY: 'auto', zIndex: 1000,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.notif_id}
                href={n.link ? `/${n.link.replace('.html', '')}` : '#'}
                onClick={() => setOpen(false)}
                style={{
                  padding: '16px', borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'white' : 'var(--emerald-soft)',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  textDecoration: 'none', color: 'var(--ink)'
                }}
              >
                <div style={{ fontSize: 14 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
