'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Profile, UserPreferences } from '@/types';
import { updateProfileSchema, updatePreferencesSchema } from '@/lib/schemas';
import { User, Settings, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';

export default function ProfileContent({ 
  initialProfile, 
  initialPreferences 
}: { 
  initialProfile: Profile; 
  initialPreferences: UserPreferences | null; 
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [prefs, setPrefs] = useState<UserPreferences | null>(initialPreferences);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: initialProfile.name,
    phone: initialProfile.phone || '',
    university_id: initialProfile.university_id || ''
  });

  // Prefs Form State
  const [prefsForm, setPrefsForm] = useState({
    sleep_schedule: initialPreferences?.sleep_schedule || 'flexible',
    study_hours: initialPreferences?.study_hours || 2,
    diet: initialPreferences?.diet || 'any',
    guest_policy: initialPreferences?.guest_policy || 'flexible',
    smoking_tolerance: initialPreferences ? initialPreferences.smoking_tolerance : true,
    preferred_gender: initialPreferences?.preferred_gender || 'any',
    cleanliness_score: initialPreferences?.cleanliness_score || 3,
    noise_tolerance: initialPreferences?.noise_tolerance || 'moderate'
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);

    const validation = updateProfileSchema.safeParse(profileForm);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoadingProfile(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        name: validation.data.name,
        phone: validation.data.phone || null,
        university_id: validation.data.university_id || null
      })
      .eq('id', profile.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated successfully!');
      setProfile({ ...profile, ...validation.data });
    }
    setLoadingProfile(false);
  };

  const handlePrefsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPrefs(true);

    const validation = updatePreferencesSchema.safeParse({
      ...prefsForm,
      study_hours: Number(prefsForm.study_hours),
      cleanliness_score: Number(prefsForm.cleanliness_score)
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoadingPrefs(false);
      return;
    }

    const supabase = createClient();
    
    // Check if we need to insert or update
    if (prefs?.pref_id) {
      const { error } = await supabase
        .from('user_preferences')
        .update(validation.data)
        .eq('pref_id', prefs.pref_id);
        
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Preferences updated!');
        setPrefs({ ...prefs, ...validation.data });
      }
    } else {
      const { data: newPrefs, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: profile.id,
          ...validation.data
        })
        .select()
        .single();
        
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Preferences created!');
        setPrefs(newPrefs);
      }
    }
    setLoadingPrefs(false);
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* Left Column: Basic Profile */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: 'var(--navy)' }}>
          <User size={24} /> Basic Information
        </h2>
        
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              value={profileForm.name} 
              onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={profile.email} disabled style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>Email cannot be changed.</div>
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input 
                type="text" 
                value={profileForm.phone} 
                onChange={e => setProfileForm({...profileForm, phone: e.target.value})} 
                placeholder="01XXXXXXXXX"
              />
            </div>
            
            <div className="form-group">
              <label>University ID (Optional)</label>
              <input 
                type="text" 
                value={profileForm.university_id} 
                onChange={e => setProfileForm({...profileForm, university_id: e.target.value})} 
                placeholder="01123XXXX"
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary btn-block" disabled={loadingProfile}>
            {loadingProfile ? 'Saving...' : 'Save Profile Details'}
          </button>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
            <ShieldCheck size={20} color="var(--success)" /> Verification
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray)' }}>
            Verifying your identity helps build trust within the UIUNest community and increases your chances of finding flatmates.
          </p>
          <button className="btn btn-outline btn-block" onClick={() => alert('Verification feature coming soon')}>
            Submit ID Document
          </button>
        </div>
      </div>

      {/* Right Column: Roommate Preferences (Students Only) */}
      {profile.role === 'student' && (
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: 'var(--navy)' }}>
            <Settings size={24} /> Roommate Preferences
          </h2>
          <p style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '24px' }}>
            Fill this out to get a Compatibility Score with other students and listings!
          </p>
          
          <form onSubmit={handlePrefsSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Sleep Schedule</label>
                <CustomSelect 
                  value={prefsForm.sleep_schedule} 
                  onChange={(v) => setPrefsForm({...prefsForm, sleep_schedule: v})}
                  options={[
                    { value: 'flexible', label: 'Flexible / Varies' },
                    { value: 'early_bird', label: 'Early Bird (Sleep early, wake early)' },
                    { value: 'night_owl', label: 'Night Owl (Sleep late, wake late)' }
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Dietary Habit</label>
                <CustomSelect 
                  value={prefsForm.diet} 
                  onChange={(v) => setPrefsForm({...prefsForm, diet: v})}
                  options={[
                    { value: 'any', label: 'No specific restrictions' },
                    { value: 'non_veg', label: 'Non-Vegetarian' },
                    { value: 'veg', label: 'Vegetarian' },
                    { value: 'halal_strict', label: 'Strict Halal / Religious restrictions' }
                  ]}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Guest Policy</label>
                <CustomSelect 
                  value={prefsForm.guest_policy} 
                  onChange={(v) => setPrefsForm({...prefsForm, guest_policy: v})}
                  options={[
                    { value: 'flexible', label: 'Flexible (Frequent guests fine)' },
                    { value: 'weekends_only', label: 'Weekends Only' },
                    { value: 'no_guests', label: 'No Guests allowed' }
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Noise Tolerance</label>
                <CustomSelect 
                  value={prefsForm.noise_tolerance} 
                  onChange={(v) => setPrefsForm({...prefsForm, noise_tolerance: v})}
                  options={[
                    { value: 'moderate', label: 'Moderate (Normal activity fine)' },
                    { value: 'quiet', label: 'Quiet (Need pin-drop silence)' },
                    { value: 'lively', label: 'Lively (Music, chatting is fine)' }
                  ]}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Flatmate Gender Pref.</label>
                <CustomSelect 
                  value={prefsForm.preferred_gender} 
                  onChange={(v) => setPrefsForm({...prefsForm, preferred_gender: v as any})}
                  options={[
                    { value: 'any', label: 'Any Gender' },
                    { value: 'male', label: 'Male Only' },
                    { value: 'female', label: 'Female Only' }
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Daily Study Hours (Avg)</label>
                <input 
                  type="number" 
                  value={prefsForm.study_hours} 
                  onChange={e => setPrefsForm({...prefsForm, study_hours: Number(e.target.value)})} 
                  min="0" max="24"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Cleanliness Priority (1-5)</label>
                <input 
                  type="range" 
                  value={prefsForm.cleanliness_score} 
                  onChange={e => setPrefsForm({...prefsForm, cleanliness_score: Number(e.target.value)})} 
                  min="1" max="5" step="1"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>
                  <span>Not strict</span>
                  <span>{prefsForm.cleanliness_score}/5</span>
                  <span>Very strict</span>
                </div>
              </div>
              <div className="form-group">
                <label>Smoking Tolerance</label>
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                      type="checkbox" 
                      checked={prefsForm.smoking_tolerance} 
                      onChange={e => setPrefsForm({...prefsForm, smoking_tolerance: e.target.checked})} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    I tolerate smoking in the flat
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-gold btn-block" disabled={loadingPrefs} style={{ marginTop: '16px' }}>
              {loadingPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
