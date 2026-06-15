'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function uploadVerificationDocument(formData: FormData) {
  try {
    const userId = formData.get('userId') as string;
    const nidType = formData.get('nidType') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) throw new Error("Missing data");

    // Verify authentication
    const authSupabase = await createServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      throw new Error("Unauthorized");
    }

    // Bypass RLS for storage using service_role key
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.name.split('.').pop();
    const filePath = `${userId}/verifications/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // Convert File to ArrayBuffer to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('uiunest')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error("Admin Upload Error: " + uploadError.message);
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from('uiunest')
      .getPublicUrl(filePath);

    const documentPath = publicUrlData.publicUrl;

    // Insert into verifications table (using normal auth so it respects RLS)
    const { error: insertError } = await authSupabase
      .from('verifications')
      .insert({
        user_id: userId,
        nid_type: nidType,
        document_path: documentPath,
        description: description
      });

    if (insertError) {
      throw new Error("DB Insert Error: " + insertError.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
