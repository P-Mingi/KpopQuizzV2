'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleGoogleSignup() {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="px-5 pt-12 pb-8 text-center">
        <p className="text-xl font-semibold mb-2">Check your email</p>
        <p className="text-sm text-text-secondary">
          We sent a confirmation link to <strong className="text-text-primary">{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="text-center mb-8">
        <p className="text-xl font-semibold mb-1">Create your account</p>
        <p className="text-[13px] text-text-secondary mt-2">
          Track your progress, earn badges, climb leaderboards
        </p>
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleSignup}
        className="w-full py-3.5 rounded-[14px] bg-bg-secondary border border-border-default text-sm font-medium text-text-primary mb-4 hover:border-border-hover transition-colors"
      >
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-[11px] text-text-tertiary">or</span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSignup} className="mb-6">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-bg-input border border-border-default text-sm text-text-primary placeholder:text-text-ghost mb-2.5 focus:border-border-active focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="w-full px-4 py-3 rounded-xl bg-bg-input border border-border-default text-sm text-text-primary placeholder:text-text-ghost mb-3 focus:border-border-active focus:outline-none"
          required
        />
        {error && (
          <p className="text-xs text-wrong mb-3">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="text-center text-xs text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-pink-400 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
