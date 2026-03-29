'use client';

import { useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';

export default function LoginPage(): React.ReactElement {
  const [loading, setLoading] = useState<'google' | 'discord' | null>(null);

  const handleLogin = async (provider: 'google' | 'discord') => {
    setLoading(provider);
    const supabase = createBrowserClient();

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') ?? '/';

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
      },
    });

    if (error) {
      setLoading(null);
      console.error('OAuth error:', error.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 px-4">
      <div className="bg-surface-primary rounded-lg border border-border-light p-6 text-center">
        <h1 className="text-lg font-medium text-txt-primary">
          Sign in to create quizzes
        </h1>
        <p className="text-sm text-txt-secondary mt-1">
          You don&apos;t need an account to play.
        </p>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={() => handleLogin('google')}
            disabled={loading !== null}
            className="w-full py-3 rounded-full border border-border-light text-sm font-medium flex items-center justify-center gap-2 hover:border-border-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading === 'google' ? (
              <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <button
            onClick={() => handleLogin('discord')}
            disabled={loading !== null}
            className="w-full py-3 rounded-full border border-border-light text-sm font-medium flex items-center justify-center gap-2 hover:border-border-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading === 'discord' ? (
              <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M15.248 3.13A14.163 14.163 0 0 0 11.74 2a9.272 9.272 0 0 0-.453.916 13.27 13.27 0 0 0-3.93 0A10.022 10.022 0 0 0 6.9 2a14.258 14.258 0 0 0-3.512 1.132C.862 6.37.222 9.513.542 12.61A14.26 14.26 0 0 0 4.88 14.8a10.6 10.6 0 0 0 .936-1.514 9.207 9.207 0 0 1-1.474-.706c.124-.09.245-.183.361-.28a10.18 10.18 0 0 0 8.636 0c.118.1.238.194.362.28a9.246 9.246 0 0 1-1.477.708 10.542 10.542 0 0 0 .936 1.512 14.21 14.21 0 0 0 4.342-2.188c.375-3.604-.64-6.718-2.654-9.482ZM6.208 10.84c-.822 0-1.5-.748-1.5-1.668 0-.92.66-1.672 1.5-1.672.84 0 1.512.752 1.5 1.672 0 .92-.66 1.668-1.5 1.668Zm5.584 0c-.822 0-1.5-.748-1.5-1.668 0-.92.66-1.672 1.5-1.672.84 0 1.508.752 1.5 1.672-.004.92-.66 1.668-1.5 1.668Z" fill="#5865F2" />
                </svg>
                Continue with Discord
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
