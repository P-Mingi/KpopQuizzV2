'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

const AVATAR_COLORS = ['#D4537E', '#9a7acc', '#e8a060', '#4a90d0', '#27ae60', '#e74c3c'];

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('kpq_guest_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('kpq_guest_id', id);
  }
  return id;
}

export default function BattleGuestPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const supabase = createBrowserClient();

  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore saved guest name/color from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('kpq_guest_name');
    const savedColor = localStorage.getItem('kpq_guest_color');
    if (savedName) setName(savedName);
    if (savedColor) {
      const idx = AVATAR_COLORS.indexOf(savedColor);
      if (idx >= 0) setColorIdx(idx);
    }
  }, []);

  const selectedColor = AVATAR_COLORS[colorIdx] ?? '#D4537E';
  const initial = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  const canJoin = name.trim().length >= 2;

  const handleJoin = async () => {
    setError(null);
    setLoading(true);

    const guestId = getOrCreateGuestId();
    localStorage.setItem('kpq_guest_name', name.trim());
    localStorage.setItem('kpq_guest_color', selectedColor);

    try {
      const { data, error: rpcError } = await supabase.rpc('battle_join_room', {
        p_code: code,
        p_display_name: name.trim(),
        p_avatar_color: selectedColor,
        p_guest_session_id: guestId,
      });

      if (rpcError || !data || !Array.isArray(data) || data.length === 0) {
        setError(rpcError?.message ?? 'Failed to join room');
        setLoading(false);
        return;
      }

      router.push(`/battle/r/${code}`);
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <div style={{ flex: 1, padding: '32px 24px' }}>

        {/* Back link */}
        <Link href="/battle/join" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: C.textMuted, textDecoration: 'none',
          marginBottom: 24,
        }}>
          &larr; Back
        </Link>

        {/* Main card */}
        <div style={{
          maxWidth: 480, margin: '0 auto', padding: 32,
          borderRadius: 18, background: '#fff',
          border: `1px solid ${C.cardBorder}`,
          boxShadow: '0 2px 24px rgba(0,0,0,0.04)',
        }}>

          {/* Room info */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: C.textMuted }}>Joining room</div>
            <div style={{
              fontSize: 26, fontWeight: 800, color: C.pink,
              fontFamily: 'monospace', letterSpacing: 4,
            }}>
              {code}
            </div>
          </div>

          {/* Avatar preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: selectedColor, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, fontWeight: 800,
              boxShadow: `0 8px 24px ${selectedColor}40`,
              transition: 'all 0.2s',
            }}>
              {initial}
            </div>
          </div>

          {/* Color picker */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {AVATAR_COLORS.map((color, i) => (
              <button
                key={color}
                onClick={() => setColorIdx(i)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: color, border: 'none', cursor: 'pointer',
                  outline: i === colorIdx ? `2.5px solid ${C.textDark}` : 'none',
                  outlineOffset: 2,
                  transform: i === colorIdx ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s',
                }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 800,
              color: C.textLight, textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 6,
            }}>
              USERNAME
            </label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Pick a name..."
              style={{
                width: '100%', padding: '12px 14px',
                borderRadius: 12, border: `1.5px solid ${C.cardBorder}`,
                background: C.bg, fontSize: 15, fontWeight: 600,
                color: C.textDark, outline: 'none',
              }}
            />
            <div style={{ fontSize: 9, color: C.textLight, marginTop: 4 }}>
              {name.length}/20 &middot; Visible to other players &middot; Saved on your device
            </div>
          </div>

          {/* Sign in CTA */}
          <div style={{
            padding: 10, borderRadius: 10,
            background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
            marginBottom: 16, fontSize: 10, color: C.textDark, lineHeight: 1.5,
          }}>
            &#128161;{' '}
            <Link href={`/login?returnTo=/battle/r/${code}`} style={{ color: C.pink, fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>{' '}
            to track wins, earn Byeol, and use your account avatar.
          </div>

          {/* Join button */}
          <button
            onClick={handleJoin}
            disabled={!canJoin || loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              border: 'none', cursor: canJoin && !loading ? 'pointer' : 'default',
              background: canJoin && !loading ? C.pink : C.bg,
              color: canJoin && !loading ? '#fff' : C.textLight,
              fontSize: 15, fontWeight: 700,
              boxShadow: canJoin ? '0 2px 12px rgba(212,83,126,0.2)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Joining...' : `Join as ${name.trim() || '...'} \u2192`}
          </button>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: C.red, textAlign: 'center', marginTop: 10 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
