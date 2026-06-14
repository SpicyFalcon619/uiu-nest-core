import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileContent from './ProfileContent';

export const metadata = {
  title: 'My Profile - UIUNest',
  description: 'Manage your profile and roommate preferences.',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Fetch preferences
  let preferences = null;
  if (profile.role === 'student') {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    preferences = prefs;
  }

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 className="page-title">My Profile</h1>
      <ProfileContent initialProfile={profile} initialPreferences={preferences} />
    </div>
  );
}
