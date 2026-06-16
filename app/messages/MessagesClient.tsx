'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markConversationRead } from '@/app/actions/messages';
import { avatarInitials } from '@/lib/utils';
import { Send, MessageCircle, Building2, ShoppingBag, CheckCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Conversation {
  id: string;
  created_at: string;
  listing_id?: number | null;
  item_id?: number | null;
  other_user: { id: string; name: string; profile_pic?: string; profile_slug?: string };
  listing_title?: string | null;
  item_title?: string | null;
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
  initialConvoId: string | null;
}

export default function MessagesClient({ conversations: initialConvos, currentUserId, initialConvoId }: MessagesClientProps) {
  const [convos, setConvos]               = useState<Conversation[]>(initialConvos);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(initialConvoId);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [search, setSearch]               = useState('');
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const supabase    = createClient();

  const activeConvo = convos.find(c => c.id === activeConvoId);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvoId) return;
    setLoadingMsgs(true);
    setMessages([]);

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvoId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setMessages((data as Message[]) || []);
        setLoadingMsgs(false);
      });

    markConversationRead(activeConvoId);
    setConvos(prev => prev.map(c => c.id === activeConvoId ? { ...c, unread_count: 0 } : c));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeConvoId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConvoId) return;
    const channel = supabase
      .channel(`msgs-${activeConvoId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConvoId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id !== currentUserId) markConversationRead(activeConvoId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvoId]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeConvoId || sending) return;
    setSending(true);
    setInput('');

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
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res.message as Message : m));
      setConvos(prev => prev.map(c => c.id === activeConvoId
        ? { ...c, last_message: { body: text, created_at: new Date().toISOString(), sender_id: currentUserId } }
        : c
      ));
    }
  }, [input, activeConvoId, sending, currentUserId]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fmtFullTime = (iso: string) =>
    new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredConvos = search.trim()
    ? convos.filter(c =>
        c.other_user.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.listing_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.item_title || '').toLowerCase().includes(search.toLowerCase())
      )
    : convos;

  const totalUnread = convos.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--surface-1)', overflow: 'hidden' }}>

          {/* Sidebar header */}
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={20} style={{ color: 'var(--primary)' }} />
                Messages
                {totalUnread > 0 && (
                  <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                    {totalUnread}
                  </span>
                )}
              </h2>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {filteredConvos.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px' }}>
                {search ? 'No results.' : (
                  <>No conversations yet.<br /><span style={{ fontSize: '12px' }}>Start one from a listing or item page.</span></>
                )}
              </div>
            ) : filteredConvos.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveConvoId(c.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: activeConvoId === c.id ? 'var(--primary-light, #EEF7F2)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${activeConvoId === c.id ? 'var(--primary)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden' }}>
                    {c.other_user.profile_pic
                      ? <img src={c.other_user.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : avatarInitials(c.other_user.name)}
                  </div>
                  {c.unread_count > 0 && (
                    <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface-1)' }}>
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontWeight: c.unread_count > 0 ? 700 : 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.other_user.name}
                    </span>
                    {c.last_message && (
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)', flexShrink: 0 }}>{fmtTime(c.last_message.created_at)}</span>
                    )}
                  </div>

                  {/* Context label */}
                  {(c.item_title || c.listing_title) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', marginTop: 1 }}>
                      {c.item_title ? <ShoppingBag size={10} /> : <Building2 size={10} />}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.item_title || c.listing_title}
                      </span>
                    </div>
                  )}

                  {c.last_message && (
                    <div style={{ fontSize: '12px', color: c.unread_count > 0 ? 'var(--ink)' : 'var(--ink-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: c.unread_count > 0 ? 500 : 400 }}>
                      {c.last_message.sender_id === currentUserId ? 'You: ' : ''}{c.last_message.body}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat window ── */}
        {activeConvo ? (
          <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, background: '#fff' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                {activeConvo.other_user.profile_pic
                  ? <img src={activeConvo.other_user.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : avatarInitials(activeConvo.other_user.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  {activeConvo.other_user.profile_slug
                    ? <Link href={`/profiles/${activeConvo.other_user.profile_slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{activeConvo.other_user.name}</Link>
                    : activeConvo.other_user.name}
                </div>
                {/* Context link — clickable */}
                {(activeConvo.item_title || activeConvo.listing_title) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--primary)', marginTop: 1 }}>
                    {activeConvo.item_title ? <ShoppingBag size={12} /> : <Building2 size={12} />}
                    {activeConvo.item_id ? (
                      <Link href={`/exchange/${activeConvo.item_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                        {activeConvo.item_title}
                      </Link>
                    ) : activeConvo.listing_id ? (
                      <Link href={`/listings/${activeConvo.listing_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                        {activeConvo.listing_title}
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '4px', scrollbarWidth: 'thin' }}>
              {loadingMsgs ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--ink-muted)' }}>
                  <MessageCircle size={40} opacity={0.2} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No messages yet. Say hello!</p>
                </div>
              ) : (
                (() => {
                  // Group messages by day
                  const groups: { date: string; messages: Message[] }[] = [];
                  messages.forEach(msg => {
                    const day = new Date(msg.created_at).toDateString();
                    const last = groups[groups.length - 1];
                    if (last && last.date === day) last.messages.push(msg);
                    else groups.push({ date: day, messages: [msg] });
                  });

                  return groups.map(group => {
                    const dayLabel = (() => {
                      const d = new Date(group.date);
                      const now = new Date();
                      if (d.toDateString() === now.toDateString()) return 'Today';
                      const y = new Date(now); y.setDate(now.getDate() - 1);
                      if (d.toDateString() === y.toDateString()) return 'Yesterday';
                      return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
                    })();

                    return (
                      <div key={group.date}>
                        {/* Day divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{dayLabel}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {group.messages.map((msg, i) => {
                            const isMine = msg.sender_id === currentUserId;
                            const isLast = i === group.messages.length - 1 || group.messages[i + 1]?.sender_id !== msg.sender_id;
                            const isFirst = i === 0 || group.messages[i - 1]?.sender_id !== msg.sender_id;

                            return (
                              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: isLast ? '6px' : '1px' }}>
                                <div
                                  title={fmtFullTime(msg.created_at)}
                                  style={{
                                    maxWidth: '65%',
                                    padding: '9px 13px',
                                    borderRadius: isMine
                                      ? `${isFirst ? 16 : 4}px 16px 4px 16px`
                                      : `16px ${isFirst ? 16 : 4}px 16px 4px`,
                                    background: isMine ? 'var(--primary)' : 'var(--surface-1)',
                                    color: isMine ? '#fff' : 'var(--ink)',
                                    fontSize: '14px',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                  }}
                                >
                                  {msg.body}
                                  {isLast && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '3px', opacity: 0.65, fontSize: '10px' }}>
                                      {fmtTime(msg.created_at)}
                                      {isMine && <CheckCheck size={10} />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
              <form
                onSubmit={handleSend}
                style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--surface-1)', borderRadius: '24px', padding: '6px 6px 6px 16px', border: '1px solid var(--border)' }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--ink)' }}
                  disabled={sending}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: input.trim() ? 'var(--primary)' : 'var(--border)',
                    color: input.trim() ? '#fff' : 'var(--ink-muted)',
                    border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, color 0.2s', flexShrink: 0,
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', color: 'var(--ink-muted)', background: 'var(--surface-1)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={32} opacity={0.4} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--ink)' }}>Your Messages</p>
              <p style={{ margin: 0, fontSize: '13px' }}>Select a conversation or start one from a listing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
