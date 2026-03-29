'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="text-center mb-8">
        <p className="text-xl font-semibold mb-1">
          kpop<span className="text-pink-400">blind</span>test
        </p>
        <p className="text-[13px] text-text-secondary mt-2">
          How well do you REALLY know K-pop?
        </p>
        <p className="text-[11px] text-text-tertiary">
          600+ songs - 45+ groups - free forever
        </p>
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleLogin}
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
      <form onSubmit={handleEmailLogin} className="mb-6">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-xs text-text-secondary mb-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-pink-400 font-medium">
          Sign up
        </Link>
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-[11px] text-text-tertiary">or</span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Anonymous */}
      <Link
        href="/"
        className="block w-full text-center py-3.5 rounded-[14px] border border-border-default text-sm font-medium text-text-secondary hover:border-border-hover transition-colors"
      >
        Continue without account
      </Link>
      <p className="text-center text-[10px] text-text-ghost mt-2">
        (progress won&apos;t be saved)
      </p>
    </div>
  );
}
