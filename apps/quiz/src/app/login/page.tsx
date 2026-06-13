'use client';

import { useEffect, useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';

type Pending = 'google' | 'discord' | 'email' | null;

// 4-point sparkle, reused for the brand mark + decorative stars.
const SPARKLE = 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z';

export default function LoginPage(): React.ReactElement {
  const [pending, setPending] = useState<Pending>(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState('/');

  // Preserve ?returnTo=... for post-login redirect + the guest link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get('returnTo') ?? '/');
  }, []);

  const callbackUrl = (to: string) =>
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?returnTo=${encodeURIComponent(to)}`;

  const handleLogin = async (provider: 'google' | 'discord') => {
    setErrorMsg(null);
    setPending(provider);
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(returnTo) },
    });

    if (error) {
      setPending(null);
      setErrorMsg(error.message);
      console.error('OAuth error:', error.message);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || pending) return;
    setErrorMsg(null);
    setPending('email');
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(returnTo) },
    });

    setPending(null);
    if (error) {
      setErrorMsg(error.message);
      console.error('Email login error:', error.message);
      return;
    }
    setEmailSent(true);
  };

  return (
    <div className="login-wrap">
      <div className="login">
        {/* Left: brand panel */}
        <div className="brand-panel">
          <div className="bp-stars" aria-hidden="true">
            <span className="bp-star" style={{ top: '14%', left: '12%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg>
            </span>
            <span className="bp-star" style={{ top: '30%', right: '14%' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg>
            </span>
            <span className="bp-star" style={{ bottom: '24%', left: '18%' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg>
            </span>
            <span className="bp-star" style={{ bottom: '38%', right: '10%' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg>
            </span>
          </div>

          <div className="bp-top">
            <div className="bp-logo">
              <span className="bp-logo-mark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={SPARKLE} /></svg>
              </span>
              <span>kpopquiz</span>
            </div>
            <h1 className="bp-head">Prove you&rsquo;re a real fan.</h1>
            <p className="bp-sub">
              Save your scores, climb the leaderboards, battle other fans, and build quizzes only
              true stans can pass.
            </p>
          </div>

          <div className="bp-stats">
            <div><div className="bp-stat-n">30+</div><div className="bp-stat-l">groups</div></div>
            <div><div className="bp-stat-n">100k+</div><div className="bp-stat-l">plays</div></div>
            <div><div className="bp-stat-n">Free</div><div className="bp-stat-l">forever</div></div>
          </div>
        </div>

        {/* Right: auth panel */}
        <div className="auth-panel">
          <h2 className="auth-h">Welcome back</h2>
          <p className="auth-sub">
            Sign in to save your progress. New here? An account is created automatically.
          </p>

          <button
            type="button"
            className="auth-btn auth-google"
            onClick={() => handleLogin('google')}
            disabled={pending !== null}
          >
            <span className="auth-icon">
              {pending === 'google' ? (
                <span className="auth-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M15.5 8.2c0-.6-.1-1-.2-1.5H8v2.8h4.2c-.2.9-.7 1.7-1.4 2.2v1.8h2.3c1.4-1.2 2.2-3.1 2.2-5.3z" fill="#4285F4" /><path d="M8 16c2.2 0 4-.7 5.3-2l-2.3-1.8c-.7.5-1.6.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H.8v1.9C2.2 14.1 4.9 16 8 16z" fill="#34A853" /><path d="M3.2 9.5c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5V4.6H.8C.3 5.6 0 6.8 0 8s.3 2.4.8 3.4l2.4-1.9z" fill="#FBBC05" /><path d="M8 3.2c1.3 0 2.4.4 3.3 1.3l2.4-2.4C12 .8 10.2 0 8 0 4.9 0 2.2 1.9.8 4.6l2.4 1.9C4 4.6 5.8 3.2 8 3.2z" fill="#EA4335" /></svg>
              )}
            </span>
            Continue with Google
          </button>

          <button
            type="button"
            className="auth-btn auth-discord"
            onClick={() => handleLogin('discord')}
            disabled={pending !== null}
          >
            <span className="auth-icon">
              {pending === 'discord' ? (
                <span className="auth-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
              )}
            </span>
            Continue with Discord
          </button>

          <div className="auth-divider"><span>or with email</span></div>

          {emailSent ? (
            <p className="auth-note">
              Magic link sent to <strong>{email}</strong>. Check your inbox to finish signing in.
            </p>
          ) : (
            <form onSubmit={handleEmailLogin}>
              <label className="field-l" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="auth-inp"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="email-btn" disabled={pending !== null || !email}>
                {pending === 'email' ? 'Sending link...' : 'Continue with email'}
              </button>
            </form>
          )}

          {errorMsg && (
            <p className="auth-note" role="alert" style={{ color: 'var(--brand-dark)', marginTop: 12 }}>
              {errorMsg}
            </p>
          )}

          <div className="auth-guest">
            <a href={returnTo}>Just let me play as a guest &rarr;</a>
          </div>

          <p className="auth-tos">
            By continuing you agree to our <a href="/terms">Terms</a> and{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
