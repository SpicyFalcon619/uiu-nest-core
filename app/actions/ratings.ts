'use server';

import { createClient } from '@/lib/supabase/server';
import { createUserNotification } from './notifications';

export async function submitRating(targetUserId: string, rating: number, review: string) {
  if (rating < 1 || rating > 5) return { error: 'Invalid rating.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in to rate.' };
  if (user.id === targetUserId) return { error: 'You cannot rate yourself.' };

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single();
  if (profile?.role === 'admin') return { error: 'Admins cannot submit ratings.' };

  const { error } = await supabase.from('user_ratings').insert({
    rater_id: user.id,
    target_user_id: targetUserId,
    rating,
    review: review.trim() || null,
  });

  if (error) return { error: error.message };

  await createUserNotification(
    targetUserId,
    'new_rating',
    `${profile?.name || 'Someone'} rated you ${rating} star${rating !== 1 ? 's' : ''}.`,
    `/dashboard`
  );

  return { success: true };
}
