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
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '40px 16px' }}>
      <div style={{
        padding: '20px 16px', borderRadius: 14,
        background: '#fff', border: '1px solid #e8e6e0',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>Join the community</p>
        <p style={{ fontSize: 10, color: '#888780', margin: 0, marginTop: 4 }}>
          Play as guest, or sign in for the full experience
        </p>

        {/* Benefits grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 14, textAlign: 'left' }}>
          {[
            { icon: '\uD83D\uDCCA', text: 'Track your scores & progress' },
            { icon: '\uD83C\uDCCF', text: 'Collect fan cards' },
            { icon: '\u2B50', text: 'Earn XP, Byeol & badges' },
            { icon: '\u270F\uFE0F', text: 'Create your own quizzes' },
          ].map(b => (
            <div key={b.text} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 8px', borderRadius: 8,
              background: 'rgba(212,83,126,0.03)', border: '1px solid rgba(212,83,126,0.06)',
            }}>
              <span style={{ fontSize: 14 }}>{b.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 500, color: '#555550', lineHeight: 1.3 }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
          <button
            onClick={() => handleLogin('google')}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 10,
              background: '#fff', border: '1px solid #e8e6e0',
              fontSize: 12, fontWeight: 500, color: '#2c2c2a', cursor: 'pointer',
              opacity: loading !== null ? 0.5 : 1,
            }}
          >
            {loading === 'google' ? (
              <div style={{ width: 16, height: 16, border: '2px solid #e8e6e0', borderTopColor: '#D4537E', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M15.5 8.2c0-.6-.1-1-.2-1.5H8v2.8h4.2c-.2.9-.7 1.7-1.4 2.2v1.8h2.3c1.4-1.2 2.2-3.1 2.2-5.3z" fill="#4285F4"/><path d="M8 16c2.2 0 4-.7 5.3-2l-2.3-1.8c-.7.5-1.6.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H.8v1.9C2.2 14.1 4.9 16 8 16z" fill="#34A853"/><path d="M3.2 9.5c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5V4.6H.8C.3 5.6 0 6.8 0 8s.3 2.4.8 3.4l2.4-1.9z" fill="#FBBC05"/><path d="M8 3.2c1.3 0 2.4.4 3.3 1.3l2.4-2.4C12 .8 10.2 0 8 0 4.9 0 2.2 1.9.8 4.6l2.4 1.9C4 4.6 5.8 3.2 8 3.2z" fill="#EA4335"/></svg>
            )}
            Continue with Google
          </button>
          <button
            onClick={() => handleLogin('discord')}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 10,
              background: '#5865F2', border: 'none',
              fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer',
              opacity: loading !== null ? 0.5 : 1,
            }}
          >
            {loading === 'discord' ? (
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#fff"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z"/></svg>
            )}
            Continue with Discord
          </button>
        </div>

        <p style={{ fontSize: 8, color: '#888780', marginTop: 10 }}>
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
