'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addComment(itemId: number, content: string) {
  if (!content.trim()) return { error: 'Comment cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to comment.' };
  }

  const { error } = await supabase
    .from('item_comments')
    .insert({
      item_id: itemId,
      user_id: user.id,
      content: content.trim()
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/exchange/${itemId}`);
  return { success: true };
}

export async function voteComment(commentId: number, voteType: 1 | -1, itemId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to vote.' };
  }

  // Check if they already voted
  const { data: existingVote } = await supabase
    .from('item_comment_votes')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: currentComment } = await supabase.from('item_comments').select('upvotes, downvotes').eq('comment_id', commentId).single();
  let upvotes = currentComment?.upvotes || 0;
  let downvotes = currentComment?.downvotes || 0;

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      await supabase.from('item_comment_votes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      if (voteType === 1) upvotes--; else downvotes--;
    } else {
      await supabase.from('item_comment_votes').update({ vote_type: voteType }).eq('comment_id', commentId).eq('user_id', user.id);
      if (voteType === 1) { upvotes++; downvotes--; } else { downvotes++; upvotes--; }
    }
  } else {
    const { error } = await supabase.from('item_comment_votes').insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
    if (error) return { error: error.message };
    if (voteType === 1) upvotes++; else downvotes++;
  }

  await supabase.from('item_comments').update({ upvotes: Math.max(0, upvotes), downvotes: Math.max(0, downvotes) }).eq('comment_id', commentId);

  revalidatePath(`/exchange/${itemId}`);
  return { success: true };
}
