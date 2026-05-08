'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

interface RecentRoom {
  code: string;
  host: string;
  lastPlayed: string;
  players: number;
}

export default function BattleHubPage(): React.ReactElement {
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    fetch('/api/battle/rooms/recent')
      .then(r => r.json())
      .then(setRecentRooms)
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <div style={{ flex: 1, padding: '32px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              fontSize: 10, fontWeight: 700, color: C.pink, marginBottom: 12,
            }}>
              <span>&#9889;</span> NEW &middot; Real-time multiplayer
            </span>
            <h1 style={{
              fontSize: 38, fontWeight: 800, letterSpacing: -0.5,
              background: `linear-gradient(135deg, ${C.pink}, ${C.amber})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: '12px 0 10px',
            }}>
              Play K-pop trivia battles with friends
            </h1>
            <p style={{ fontSize: 14, color: C.textMuted, maxWidth: 540, margin: '0 auto' }}>
              Real-time rooms &middot; 2-8 players &middot; K-pop questions only &middot; First to 100 points wins. Free to play, anyone can join with a code.
            </p>
          </div>

          {/* Two CTA cards */}
          <div className="battle-cta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

            {/* Create room card */}
            <Link href="/battle/create" style={{
              position: 'relative', padding: '32px 28px', borderRadius: 18, overflow: 'hidden',
              background: `linear-gradient(135deg, #1a0a1e 0%, #3a1848 50%, ${C.pink} 100%)`,
              textDecoration: 'none', display: 'block',
            }}>
              {/* Decorative blurred circles */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 140, height: 140,
                background: 'rgba(212,83,126,0.3)', borderRadius: '50%', filter: 'blur(40px)',
              }} />
              <div style={{
                position: 'absolute', bottom: -20, left: -20, width: 100, height: 100,
                background: 'rgba(154,122,204,0.2)', borderRadius: '50%', filter: 'blur(30px)',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10,
                }}>
                  <span style={{ fontSize: 13 }}>&#9889;</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
                    textTransform: 'uppercase', letterSpacing: 2,
                  }}>
                    HOST A ROOM
                  </span>
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                  Create room
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 18px', lineHeight: 1.5 }}>
                  Get a 4-digit code, invite up to 8 friends, set the rules. Hosting requires an account.
                </p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10,
                  background: '#fff', color: C.pink,
                  fontSize: 13, fontWeight: 700,
                }}>
                  Create room &rarr;
                </span>
              </div>
            </Link>

            {/* Join with code card */}
            <Link href="/battle/join" style={{
              padding: '32px 28px', borderRadius: 18,
              background: '#fff', border: `1.5px solid ${C.pinkBorder}`,
              textDecoration: 'none', display: 'block',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10,
              }}>
                <span style={{ fontSize: 13 }}>&#127903;</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: C.textLight,
                  textTransform: 'uppercase', letterSpacing: 2,
                }}>
                  HAVE A CODE?
                </span>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: C.textDark, margin: '0 0 8px' }}>
                Join with code
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
                Enter the 4-digit code your friend gave you. Guests can join - no account needed.
              </p>
              {/* Code input preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: 38, height: 44, borderRadius: 8,
                    background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                  }} />
                ))}
                <span style={{
                  marginLeft: 8, padding: '8px 14px', borderRadius: 8,
                  background: C.pink, color: '#fff',
                  fontSize: 12, fontWeight: 700,
                }}>
                  Join &rarr;
                </span>
              </div>
            </Link>
          </div>

          {/* How it works */}
          <div style={{
            padding: 24, borderRadius: 16,
            background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
            marginBottom: 32,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 800, color: C.pink,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              HOW IT WORKS
            </span>
            <div className="battle-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
              {[
                { n: 1, title: 'Create or join', desc: 'Host gets a 4-digit code. Players use the code to join' },
                { n: 2, title: 'Set the rules', desc: 'Difficulty, Groups, Time per round, Korean mode' },
                { n: 3, title: 'Answer fast', desc: 'Free-text input. Faster = more points. Up to 10 pts/round' },
                { n: 4, title: 'Race to 100', desc: 'First player to 100 total points wins the game' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: C.pink, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {step.n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{step.title}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{step.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent rooms */}
          {recentRooms.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark }}>Your recent rooms</span>
              </div>
              <div className="battle-recent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {recentRooms.map(room => (
                  <Link key={room.code} href={`/battle/r/${room.code}`} style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: '#fff', border: `1px solid ${C.cardBorder}`,
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: C.pinkLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: C.pink,
                    }}>
                      {room.code}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDark }}>by {room.host}</div>
                      <div style={{ fontSize: 9, color: C.textLight }}>{room.lastPlayed} &middot; {room.players} played</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Create questions CTA */}
          <div style={{
            padding: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(154,122,204,0.08), rgba(154,122,204,0.04))',
            border: '1px solid rgba(154,122,204,0.15)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(154,122,204,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              &#9997;&#65039;
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Create your own questions</span>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                Submit K-pop trivia questions for everyone to play. Approved ones appear in battle rooms.
              </div>
            </div>
            <Link href="/battle/questions/new" style={{
              padding: '8px 16px', borderRadius: 8,
              background: '#fff', color: C.purple,
              fontSize: 12, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap',
              border: '1px solid rgba(154,122,204,0.2)',
            }}>
              Submit a question &rarr;
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
