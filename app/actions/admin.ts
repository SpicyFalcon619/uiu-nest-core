'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Helper to get admin client but verify authorization first
async function getAdminSupabase() {
  const authSupabase = await createServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await authSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error("Unauthorized: Admin access required");
  }

  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function adminUpdateVerification(id: number, status: 'approved' | 'rejected') {
  try {
    const adminSupabase = await getAdminSupabase();
    const { error } = await adminSupabase
      .from('verifications')
      .update({ status })
      .eq('verification_id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminUpdateComplaint(id: number, status: 'resolved' | 'dismissed') {
  try {
    const adminSupabase = await getAdminSupabase();
    const { error } = await adminSupabase
      .from('complaints')
      .update({ status })
      .eq('complaint_id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminUpdateUserStatus(id: string, status: 'active' | 'suspended') {
  try {
    const adminSupabase = await getAdminSupabase();
    const { error } = await adminSupabase
      .from('profiles')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminDeleteListing(id: number) {
  try {
    const adminSupabase = await getAdminSupabase();
    const { error } = await adminSupabase
      .from('listings')
      .delete()
      .eq('listing_id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
