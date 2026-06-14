'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const supabase = createClient();

  const nextUrl = searchParams.get('next') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message, 'error');
        setLoading(false);
        return;
      }

      showToast('Logged in successfully!', 'success');
      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'An error occurred during login', 'error');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="form-group">
        <label>Email or ID</label>
        <input 
          type="text" 
          placeholder="Enter your email or ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input 
          type="password" 
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Signing in...' : 'Log In'}
      </button>
      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '14px' }}>
        Don't have an account? <Link href="/register">Register</Link>
      </div>
    </form>
  );
}
