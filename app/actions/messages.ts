'use server';

import { createClient } from '@/lib/supabase/server';
import { createUserNotification } from './notifications';

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

  let query = supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b);

  if (listingId) query = query.eq('listing_id', listingId);
  else query = query.is('listing_id', null);
  if (itemId) query = query.eq('item_id', itemId);
  else query = query.is('item_id', null);

  const { data: existing } = await query.maybeSingle();
  if (existing) return { conversationId: existing.id };

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

  // Notify the other participant
  const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a;
  const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
  await createUserNotification(
    otherId,
    'new_message',
    `${senderProfile?.name || 'Someone'} sent you a message.`,
    `/messages/${conversationId}`
  );

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
