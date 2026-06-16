import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MessagesClient from './MessagesClient';

export const metadata = { title: 'Messages - UIUNest' };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch all conversations with the other participant's profile and last message
  const { data: convosA } = await supabase
    .from('conversations')
    .select(`
      id, created_at, listing_id, item_id,
      other_user:profiles!conversations_participant_b_fkey(id, name, profile_pic, profile_slug),
      listing:listings(title),
      item:items(title)
    `)
    .eq('participant_a', user.id)
    .order('created_at', { ascending: false });

  const { data: convosB } = await supabase
    .from('conversations')
    .select(`
      id, created_at, listing_id, item_id,
      other_user:profiles!conversations_participant_a_fkey(id, name, profile_pic, profile_slug),
      listing:listings(title),
      item:items(title)
    `)
    .eq('participant_b', user.id)
    .order('created_at', { ascending: false });

  const allConvos = [...(convosA || []), ...(convosB || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Fetch last message + unread count per conversation
  const convosWithMeta = await Promise.all(
    allConvos.map(async (c: any) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('body, created_at, sender_id')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      return { ...c, last_message: lastMsg, unread_count: unread || 0 };
    })
  );

  return <MessagesClient conversations={convosWithMeta} currentUserId={user.id} />;
}
