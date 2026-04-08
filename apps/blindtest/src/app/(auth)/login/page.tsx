'use client';

import Link from 'next/link';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

export default function LoginPage() {
  async function handleOAuth(provider: 'google' | 'discord') {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="px-5 pt-12 pb-8">
      <div className="text-center mb-8">
        <p className="text-xl font-semibold mb-1">
          kpop<span style={{ color: 'var(--accent)' }}>blind</span>test
        </p>
        <p className="text-[13px] text-secondary mt-2">
          How well do you REALLY know K-pop?
        </p>
        <p className="text-[11px] text-tertiary">
          600+ songs - 45+ groups - free forever
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[14px] bg-surface border border-default text-sm font-medium text-primary hover:border-default transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuth('discord')}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[14px] bg-surface border border-default text-sm font-medium text-primary hover:border-default transition-colors"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M15.248 1.19A14.84 14.84 0 0011.58 0a.056.056 0 00-.059.028c-.158.281-.333.648-.456.936a13.71 13.71 0 00-4.13 0 9.53 9.53 0 00-.462-.936A.058.058 0 006.414 0a14.8 14.8 0 00-3.668 1.19.053.053 0 00-.024.02C.398 4.85-.238 8.406.074 11.919a.062.062 0 00.024.042 14.91 14.91 0 004.494 2.272.058.058 0 00.063-.02c.346-.473.654-.972.92-1.496a.057.057 0 00-.031-.08 9.82 9.82 0 01-1.404-.669.058.058 0 01-.006-.096c.094-.071.189-.144.279-.218a.056.056 0 01.058-.008c2.946 1.345 6.135 1.345 9.046 0a.056.056 0 01.06.007c.09.074.184.148.279.22a.058.058 0 01-.005.095 9.22 9.22 0 01-1.405.668.057.057 0 00-.03.08c.27.524.578 1.023.918 1.496a.058.058 0 00.063.021 14.87 14.87 0 004.502-2.272.058.058 0 00.024-.041c.373-3.862-.625-7.215-2.647-10.188a.046.046 0 00-.024-.021zM6.012 9.768c-.882 0-1.608-.81-1.608-1.804s.712-1.804 1.608-1.804c.903 0 1.622.817 1.608 1.804 0 .994-.712 1.804-1.608 1.804zm5.946 0c-.882 0-1.608-.81-1.608-1.804s.712-1.804 1.608-1.804c.903 0 1.622.817 1.608 1.804 0 .994-.705 1.804-1.608 1.804z" fill="#5865F2"/>
          </svg>
          Continue with Discord
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-[11px] text-tertiary">or</span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Anonymous */}
      <Link
        href="/"
        className="block w-full text-center py-3.5 rounded-[14px] border border-default text-sm font-medium text-secondary hover:border-default transition-colors"
      >
        Continue without account
      </Link>
      <p className="text-center text-[10px] text-ghost mt-2">
        (progress won&apos;t be saved)
      </p>
    </div>
  );
}
