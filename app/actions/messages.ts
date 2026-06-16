'use server';

import { createClient } from '@/lib/supabase/server';
/** Get or create a conversation between the current user and another user */
export async function getOrCreateConversation(
  otherUserId: string,
  listingId?: number | null,
  itemId?: number | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  if (user.id === otherUserId) return { error: 'Cannot message yourself.' };

  const [a, b] = user.id < otherUserId ? [user.id, otherUserId] : [otherUserId, user.id];

  // Find any existing conversation between this pair regardless of listing/item context
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  // No conversation yet — create one, storing context for reference
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b, listing_id: listingId ?? null, item_id: itemId ?? null })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { conversationId: created.id };
}

/** Send a message (client calls this as server action) */
export async function sendMessage(conversationId: string, body: string) {
  if (!body.trim()) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify participant
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', conversationId)
    .single();

  if (!conv || (conv.participant_a !== user.id && conv.participant_b !== user.id)) {
    return { error: 'Unauthorized' };
  }

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: body.trim() })
    .select('*')
    .single();

  if (error) return { error: error.message };

  return { success: true, message: msg };
}

/** Mark all messages in a conversation as read */
export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id);

  return { success: true };
}

/** Mark the latest received message in a conversation as unread */
export async function markConversationUnread(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: msgs } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!msgs || msgs.length === 0) return { success: true };

  await supabase
    .from('messages')
    .update({ is_read: false })
    .eq('id', msgs[0].id);

  return { success: true };
}
