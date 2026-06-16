'use server';

import { createClient } from '@/lib/supabase/server';
import { createUserNotification } from './notifications';
import { revalidatePath } from 'next/cache';

export async function addComment(itemId: number, content: string, type: 'item' | 'listing' = 'item') {
  if (!content.trim()) return { error: 'Comment cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in to comment.' };

  const table = type === 'item' ? 'item_comments' : 'listing_comments';
  const idCol  = type === 'item' ? 'item_id'     : 'listing_id';

  const { data: inserted, error } = await supabase
    .from(table)
    .insert({ [idCol]: itemId, user_id: user.id, content: content.trim() })
    .select('*')
    .single();

  if (error) return { error: error.message };

  // Attach profile separately (avoids FK name guessing across different comment tables)
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, profile_pic')
    .eq('id', user.id)
    .single();

  // Notify the owner/seller
  const { data: commenter } = await supabase.from('profiles').select('name').eq('id', user.id).single();
  const commenterName = commenter?.name || 'Someone';

  if (type === 'listing') {
    const { data: listing } = await supabase.from('listings').select('user_id, title').eq('listing_id', itemId).single();
    if (listing && listing.user_id !== user.id) {
      await createUserNotification(
        listing.user_id,
        'new_comment',
        `${commenterName} commented on your listing "${listing.title}"`,
        `/listings/${itemId}`
      );
    }
  } else {
    const { data: item } = await supabase.from('items').select('seller_id, title').eq('item_id', itemId).single();
    if (item && item.seller_id !== user.id) {
      await createUserNotification(
        item.seller_id,
        'new_comment',
        `${commenterName} commented on your item "${item.title}"`,
        `/exchange/${itemId}`
      );
    }
  }

  revalidatePath(type === 'item' ? `/exchange/${itemId}` : `/listings/${itemId}`);
  return { success: true, comment: { ...inserted, user: profile || { name: 'You', profile_pic: null } } };
}

export async function voteComment(commentId: number, voteType: 1 | -1, itemId: number, type: 'item' | 'listing' = 'item') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in to vote.' };

  const tableVotes    = type === 'item' ? 'item_comment_votes'    : 'listing_comment_votes';
  const tableComments = type === 'item' ? 'item_comments'         : 'listing_comments';

  const { data: existingVote } = await supabase
    .from(tableVotes)
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: current } = await supabase.from(tableComments).select('upvotes, downvotes').eq('comment_id', commentId).single();
  let up = current?.upvotes || 0;
  let dn = current?.downvotes || 0;

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      await supabase.from(tableVotes).delete().eq('comment_id', commentId).eq('user_id', user.id);
      if (voteType === 1) up--; else dn--;
    } else {
      await supabase.from(tableVotes).update({ vote_type: voteType }).eq('comment_id', commentId).eq('user_id', user.id);
      if (voteType === 1) { up++; dn--; } else { dn++; up--; }
    }
  } else {
    const { error } = await supabase.from(tableVotes).insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
    if (error) return { error: error.message };
    if (voteType === 1) up++; else dn++;
  }

  await supabase.from(tableComments).update({ upvotes: Math.max(0, up), downvotes: Math.max(0, dn) }).eq('comment_id', commentId);

  revalidatePath(type === 'item' ? `/exchange/${itemId}` : `/listings/${itemId}`);
  return { success: true, upvotes: Math.max(0, up), downvotes: Math.max(0, dn) };
}
