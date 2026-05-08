'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

interface RecentRoom {
  code: string;
  host: string;
  lastPlayed: string;
  players: number;
}

export default function BattleJoinPage(): React.ReactElement {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/battle/rooms/recent')
      .then(r => r.json())
      .then(setRecentRooms)
      .catch(() => {});
  }, []);

  const updateDigit = useCallback((i: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (!/^\d?$/.test(val)) return;
    setCode(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
    if (val && i < 3) inputs.current[i + 1]?.focus();
  }, []);

  const handleKeyDown = useCallback((i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }, [code]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const next = ['', '', '', ''];
      for (let i = 0; i < pasted.length && i < 4; i++) {
        next[i] = pasted[i] ?? '';
      }
      setCode(next);
      const focusIdx = Math.min(pasted.length, 3);
      inputs.current[focusIdx]?.focus();
    }
  }, []);

  const isComplete = code.every(c => c !== '');

  const handleJoin = async () => {
    setError(null);
    setLoading(true);
    const codeStr = code.join('');

    try {
      const res = await fetch(`/api/battle/rooms/${codeStr}/check`);
      if (!res.ok) {
        setError('Room not found or unavailable');
        setLoading(false);
        return;
      }
      const { exists, full } = await res.json();
      if (!exists) { setError('Room not found'); setLoading(false); return; }
      if (full) { setError('Room is full (8/8 players)'); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push(`/battle/r/${codeStr}`);
      } else {
        router.push(`/battle/r/${codeStr}/guest`);
      }
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <div style={{ flex: 1, padding: '32px 24px' }}>

        {/* Back link */}
        <Link href="/battle" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: C.textMuted, textDecoration: 'none',
          marginBottom: 24,
        }}>
          &larr; Back to Battle hub
        </Link>

        <div className="battle-join-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, maxWidth: 760, margin: '0 auto' }}>

          {/* Left: Code input card */}
          <div style={{
            padding: 40, borderRadius: 18,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            boxShadow: '0 2px 24px rgba(0,0,0,0.04)',
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textDark, margin: 0 }}>
              Enter room code
            </h2>
            <p style={{ fontSize: 12, color: C.textMuted, margin: '8px 0 28px' }}>
              The host shared a 4-digit code with you. Type it below to join.
            </p>

            {/* Code inputs */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }} onPaste={handlePaste}>
              {[0, 1, 2, 3].map(i => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[i]}
                  onChange={e => updateDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 80, height: 96, borderRadius: 14,
                    border: `2px solid ${code[i] ? C.pinkBorder : C.cardBorder}`,
                    background: code[i] ? C.pinkLight : C.bg,
                    fontSize: 40, fontWeight: 800, fontFamily: 'monospace',
                    textAlign: 'center', color: C.textDark,
                    outline: 'none', transition: 'all 0.15s',
                  }}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Join button */}
            <button
              onClick={handleJoin}
              disabled={!isComplete || loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12,
                border: 'none', cursor: isComplete && !loading ? 'pointer' : 'default',
                background: isComplete && !loading ? C.pink : C.bg,
                color: isComplete && !loading ? '#fff' : C.textLight,
                fontSize: 15, fontWeight: 700,
                boxShadow: isComplete ? '0 2px 12px rgba(212,83,126,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Joining...' : 'Join room'}
            </button>

            {/* Error message */}
            {error && (
              <p style={{ fontSize: 12, color: C.red, textAlign: 'center', marginTop: 10 }}>
                {error}
              </p>
            )}

            {/* Help text */}
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 12 }}>
              Don&apos;t have a code?{' '}
              <Link href="/battle/create" style={{ color: C.pink, fontWeight: 600, textDecoration: 'none' }}>
                Create one &rarr;
              </Link>
            </p>
          </div>

          {/* Right: Recent rooms + tip */}
          <div>
            {recentRooms.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: C.textLight,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  RECENT ROOMS
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {recentRooms.map(room => (
                    <button
                      key={room.code}
                      onClick={() => {
                        const digits = room.code.split('');
                        setCode(digits.length === 4 ? digits : ['', '', '', '']);
                      }}
                      style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff', border: `1px solid ${C.cardBorder}`,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: C.pink }}>
                        {room.code}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDark }}>by {room.host}</span>
                      <span style={{ fontSize: 9, color: C.textLight }}>{room.lastPlayed}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: C.textLight,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                TIP
              </span>
              <div style={{
                marginTop: 8, padding: 12, borderRadius: 10,
                background: C.pinkLight, fontSize: 10, color: C.textDark, lineHeight: 1.5,
              }}>
                &#128161; Codes are auto-typed when pasted. Try copying a code and clicking the first input.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
