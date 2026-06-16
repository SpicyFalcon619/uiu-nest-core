'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markConversationRead, markConversationUnread } from '@/app/actions/messages';
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

// ── tiny helpers ────────────────────────────────────────────────
const EMERALD       = '#1A5C45';
const EMERALD_SOFT  = '#E8F5EE';
const EMERALD_LIGHT = '#EEF7F2';

function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: EMERALD, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.35,
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : avatarInitials(name)}
    </div>
  );
}

export default function MessagesClient({ conversations: initialConvos, currentUserId, initialConvoId }: MessagesClientProps) {
  const [convos, setConvos]               = useState<Conversation[]>(initialConvos);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(initialConvoId);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [search, setSearch]               = useState('');
  const [ctxMenu, setCtxMenu]             = useState<{ convId: string; x: number; y: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const supabase  = createClient();

  const activeConvo = convos.find(c => c.id === activeConvoId);

  // Load messages
  useEffect(() => {
    if (!activeConvoId) return;
    setLoadingMsgs(true);
    setMessages([]);
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvoId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setMessages((data as Message[]) || []); setLoadingMsgs(false); });
    markConversationRead(activeConvoId);
    setConvos(prev => prev.map(c => c.id === activeConvoId ? { ...c, unread_count: 0 } : c));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeConvoId]);

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime — INSERT new messages + UPDATE read status
  useEffect(() => {
    if (!activeConvoId) return;
    const channel = supabase
      .channel(`msgs-${activeConvoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvoId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id !== currentUserId) markConversationRead(activeConvoId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvoId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: msg.is_read } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvoId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeConvoId || sending) return;
    setSending(true);
    setInput('');
    const optimistic: Message = { id: `opt-${Date.now()}`, conversation_id: activeConvoId, sender_id: currentUserId, body: text, is_read: false, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    const res = await sendMessage(activeConvoId, text);
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
    } else if (res.message) {
      const real = res.message as Message;
      // If realtime already inserted the real message, just drop the optimistic copy
      setMessages(prev =>
        prev.some(m => m.id === real.id)
          ? prev.filter(m => m.id !== optimistic.id)
          : prev.map(m => m.id === optimistic.id ? real : m)
      );
      setConvos(prev => prev.map(c => c.id === activeConvoId
        ? { ...c, last_message: { body: text, created_at: new Date().toISOString(), sender_id: currentUserId } }
        : c));
    }
  }, [input, activeConvoId, sending, currentUserId]);

  const handleMarkUnread = useCallback(async (convId: string) => {
    await markConversationUnread(convId);
    setConvos(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 1 } : c));
    if (activeConvoId === convId) setActiveConvoId(null);
  }, [activeConvoId]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const fmtFull = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filtered = search.trim()
    ? convos.filter(c => c.other_user.name.toLowerCase().includes(search.toLowerCase()) || (c.listing_title || '').toLowerCase().includes(search.toLowerCase()) || (c.item_title || '').toLowerCase().includes(search.toLowerCase()))
    : convos;

  const totalUnread = convos.reduce((s, c) => s + c.unread_count, 0);

  // Navbar height is ~64px — fill the rest of the viewport
  const NAV_H = 64;

  return (
    <div style={{ height: `calc(100vh - ${NAV_H}px)`, display: 'flex', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid var(--border)`, background: 'var(--surface-1)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid var(--border)`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Messages</span>
            {totalUnread > 0 && (
              <span style={{ background: EMERALD, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{totalUnread}</span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', boxSizing: 'border-box', color: 'var(--ink)', outline: 'none' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              {search ? 'No results.' : 'No conversations yet.\nStart one from a listing or item page.'}
            </div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvoId(c.id)}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ convId: c.id, x: e.clientX, y: e.clientY }); }}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: activeConvoId === c.id ? EMERALD_LIGHT : 'transparent',
                border: 'none', borderBottom: `1px solid var(--border)`,
                borderLeft: `3px solid ${activeConvoId === c.id ? EMERALD : 'transparent'}`,
                cursor: 'pointer', transition: 'background 0.12s',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={c.other_user.profile_pic} name={c.other_user.name} size={42} />
                {c.unread_count > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 15, height: 15, borderRadius: '50%', background: EMERALD, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontWeight: c.unread_count > 0 ? 700 : 600, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                    {c.other_user.name}
                  </span>
                  {c.last_message && <span style={{ fontSize: 10, color: 'var(--ink-muted)', flexShrink: 0 }}>{fmtTime(c.last_message.created_at)}</span>}
                </div>
                {(c.item_title || c.listing_title) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: EMERALD, marginTop: 1 }}>
                    {c.item_title ? <ShoppingBag size={9} /> : <Building2 size={9} />}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{c.item_title || c.listing_title}</span>
                  </div>
                )}
                {c.last_message && (
                  <div style={{ fontSize: 12, color: c.unread_count > 0 ? 'var(--ink)' : 'var(--ink-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: c.unread_count > 0 ? 500 : 400 }}>
                    {c.last_message.sender_id === currentUserId ? 'You: ' : ''}{c.last_message.body}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {activeConvo ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>

          {/* Chat header */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid var(--border)`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#fff' }}>
            <Avatar src={activeConvo.other_user.profile_pic} name={activeConvo.other_user.name} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {activeConvo.other_user.profile_slug
                  ? <Link href={`/profiles/${activeConvo.other_user.profile_slug}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{activeConvo.other_user.name}</Link>
                  : activeConvo.other_user.name}
              </div>
              {(activeConvo.item_title || activeConvo.listing_title) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: EMERALD, marginTop: 1 }}>
                  {activeConvo.item_title ? <ShoppingBag size={11} /> : <Building2 size={11} />}
                  {activeConvo.item_id
                    ? <Link href={`/exchange/${activeConvo.item_id}`} style={{ color: EMERALD, textDecoration: 'none', fontWeight: 500 }}>{activeConvo.item_title}</Link>
                    : activeConvo.listing_id
                    ? <Link href={`/listings/${activeConvo.listing_id}`} style={{ color: EMERALD, textDecoration: 'none', fontWeight: 500 }}>{activeConvo.listing_title}</Link>
                    : null}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2, scrollbarWidth: 'thin' }}>
            {loadingMsgs ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ink-muted)' }}>
                <MessageCircle size={40} style={{ opacity: 0.2 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No messages yet — say hello!</p>
              </div>
            ) : (() => {
              // Group by day
              const groups: { date: string; messages: Message[] }[] = [];
              messages.forEach(msg => {
                const day = new Date(msg.created_at).toDateString();
                const last = groups[groups.length - 1];
                if (last?.date === day) last.messages.push(msg);
                else groups.push({ date: day, messages: [msg] });
              });

              return groups.map(group => {
                const dayLabel = (() => {
                  const d = new Date(group.date), now = new Date();
                  if (d.toDateString() === now.toDateString()) return 'Today';
                  const y = new Date(now); y.setDate(now.getDate() - 1);
                  if (d.toDateString() === y.toDateString()) return 'Yesterday';
                  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
                })();

                return (
                  <div key={group.date}>
                    {/* Day divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>{dayLabel}</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {group.messages.map((msg, i) => {
                        const isMine = msg.sender_id === currentUserId;
                        const prevSame = i > 0 && group.messages[i - 1].sender_id === msg.sender_id;
                        const nextSame = i < group.messages.length - 1 && group.messages[i + 1].sender_id === msg.sender_id;

                        // Bubble border-radius: round all corners except the "tail" corner
                        const r = '16px';
                        const tl = isMine ? r : (prevSame ? '4px' : r);
                        const tr = isMine ? (prevSame ? '4px' : r) : r;
                        const br = isMine ? (nextSame ? '4px' : r) : r;
                        const bl = isMine ? r : (nextSame ? '4px' : r);

                        return (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: nextSame ? 0 : 6 }}>
                            <div
                              title={fmtFull(msg.created_at)}
                              style={{
                                maxWidth: '66%',
                                padding: '9px 13px',
                                borderRadius: `${tl} ${tr} ${br} ${bl}`,
                                background: isMine ? EMERALD : EMERALD_SOFT,
                                color: isMine ? '#ffffff' : 'var(--ink)',
                                fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              }}
                            >
                              {msg.body}
                              {!nextSame && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3, fontSize: 10 }}>
                                  <span style={{ opacity: isMine ? 0.75 : 0.55 }}>{fmtTime(msg.created_at)}</span>
                                  {isMine && (
                                    <CheckCheck
                                      size={10}
                                      aria-label={msg.is_read ? 'Read' : 'Sent'}
                                      style={{ color: msg.is_read ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                                    />
                                  )}
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
            })()}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '10px 16px 14px', borderTop: `1px solid var(--border)`, background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-1)', borderRadius: 24, padding: '5px 5px 5px 16px', border: `1.5px solid var(--border)`, transition: 'border-color 0.2s' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message… (Enter to send)"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit' }}
                disabled={sending}
                autoComplete="off"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: input.trim() ? EMERALD : 'var(--border)',
                  color: input.trim() ? '#fff' : 'var(--ink-muted)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--ink-muted)', background: 'var(--surface-1)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: EMERALD_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={28} color={EMERALD} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>Your Messages</p>
            <p style={{ margin: 0, fontSize: 13 }}>Select a conversation to start chatting.</p>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 99999, background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid var(--border)', padding: '4px 0', minWidth: 160 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: 'var(--ink)' }}
            onMouseDown={() => { handleMarkUnread(ctxMenu.convId); setCtxMenu(null); }}
          >
            Mark as unread
          </button>
        </div>
      )}
    </div>
  );
}
