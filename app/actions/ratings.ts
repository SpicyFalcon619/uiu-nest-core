'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitRating(targetUserId: string, rating: number, review: string) {
  if (rating < 1 || rating > 5) return { error: 'Invalid rating.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to rate.' };
  }

  if (user.id === targetUserId) {
    return { error: 'You cannot rate yourself.' };
  }

  // Insert the rating
  const { error } = await supabase
    .from('user_ratings')
    .insert({
      rater_id: user.id,
      target_user_id: targetUserId,
      rating,
      review: review.trim() || null
    });

  if (error) {
    // Unique constraint on rater/target could be added if you only want 1 rating per pair
    return { error: error.message };
  }

  return { success: true };
}
