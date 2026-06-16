'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markConversationRead } from '@/app/actions/messages';
import { avatarInitials } from '@/lib/utils';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  created_at: string;
  listing_id?: number | null;
  item_id?: number | null;
  other_user: { id: string; name: string; profile_pic?: string; profile_slug?: string };
  listing?: { title: string } | null;
  item?: { title: string } | null;
  last_message?: { body: string; created_at: string; sender_id: string } | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface MessagesClientProps {
  conversations: Conversation[];
  currentUserId: string;
}

export default function MessagesClient({ conversations: initialConvos, currentUserId }: MessagesClientProps) {
  const searchParams = useSearchParams();
  const urlConvo = searchParams.get('convo');
  const [convos, setConvos] = useState<Conversation[]>(initialConvos);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(
    urlConvo && initialConvos.some(c => c.id === urlConvo) ? urlConvo : (initialConvos[0]?.id || null)
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const activeConvo = convos.find(c => c.id === activeConvoId);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvoId) return;
    setLoadingMsgs(true);

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvoId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || []);
        setLoadingMsgs(false);
      });

    markConversationRead(activeConvoId);
    // Mark as read in local state
    setConvos(prev => prev.map(c => c.id === activeConvoId ? { ...c, unread_count: 0 } : c));
  }, [activeConvoId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConvoId) return;

    const channel = supabase
      .channel(`messages:${activeConvoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvoId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== currentUserId) {
          markConversationRead(activeConvoId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvoId]);

  const handleSend = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeConvoId || sending) return;
    setSending(true);
    setInput('');

    // Optimistic
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: activeConvoId,
      sender_id: currentUserId,
      body: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const res = await sendMessage(activeConvoId, text);
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
    } else if (res.message) {
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res.message as Message : m));
      // Update last_message in sidebar
      setConvos(prev => prev.map(c => c.id === activeConvoId
        ? { ...c, last_message: { body: text, created_at: new Date().toISOString(), sender_id: currentUserId } }
        : c
      ));
    }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="container" style={{ padding: '32px 5%' }}>
      <h1 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MessageCircle size={28} /> Messages
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', minHeight: 'calc(100vh - 220px)' }}>

        {/* ── Conversation list ── */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--surface-1)' }}>
          {convos.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              No conversations yet.<br />Start one from a listing or item page.
            </div>
          ) : (
            convos.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveConvoId(c.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                  background: activeConvoId === c.id ? 'var(--primary-light, #EEF7F2)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  borderLeft: activeConvoId === c.id ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                  {c.other_user.profile_pic
                    ? <img src={c.other_user.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : avatarInitials(c.other_user.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{c.other_user.name}</span>
                    {c.last_message && <span style={{ fontSize: '11px', color: 'var(--ink-muted)', flexShrink: 0 }}>{fmtTime(c.last_message.created_at)}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.item?.title ? `📦 ${c.item.title}` : c.listing?.title ? `🏠 ${c.listing.title}` : ''}
                  </div>
                  {c.last_message && (
                    <div style={{ fontSize: '13px', color: c.unread_count > 0 ? 'var(--primary)' : 'var(--ink-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: c.unread_count > 0 ? 600 : 400 }}>
                      {c.last_message.sender_id === currentUserId ? 'You: ' : ''}{c.last_message.body}
                    </div>
                  )}
                </div>
                {c.unread_count > 0 && (
                  <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* ── Chat window ── */}
        {activeConvo ? (
          <div style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
                {activeConvo.other_user.profile_pic
                  ? <img src={activeConvo.other_user.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : avatarInitials(activeConvo.other_user.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{activeConvo.other_user.name}</div>
                {(activeConvo.item?.title || activeConvo.listing?.title) && (
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                    {activeConvo.item?.title ? `📦 ${activeConvo.item.title}` : `🏠 ${activeConvo.listing?.title}`}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '40px 0' }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '40px 0' }}>No messages yet. Say hello!</div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMine ? 'var(--primary)' : 'var(--surface-1)',
                        color: isMine ? '#fff' : 'var(--ink)',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}>
                        <div>{msg.body}</div>
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, textAlign: 'right' }}>{fmtTime(msg.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                disabled={sending}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={{
                  width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!input.trim() || sending) ? 0.5 : 1, transition: 'opacity 0.2s', flexShrink: 0,
                }}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)', flexDirection: 'column', gap: '12px' }}>
            <MessageCircle size={48} opacity={0.3} />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
