'use client';

import Link from 'next/link';
import { BATTLE_PALETTE as C, BATTLE_WIN_SCORE } from '@/lib/battle/battle-constants';
import type { BattleRoomState } from '@/lib/battle/use-battle-room';

interface GameOverViewProps {
  state: BattleRoomState;
}

export function GameOverView({ state }: GameOverViewProps): React.ReactElement {
  const { room, players, currentPlayer } = state;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.id === currentPlayer?.id;

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 20px', borderBottom: `1px solid ${C.cardBorder}`,
        background: '#fff',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>
          kpop<span style={{ fontWeight: 800, color: C.pink }}>quiz</span>
        </span>
        <span style={{ fontSize: 11, color: C.textLight, marginLeft: 8 }}>&middot; Room {room?.code}</span>
      </header>

      <div style={{
        flex: 1, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 560, width: '100%' }}>

          {/* Winner announcement */}
          <div style={{
            textAlign: 'center', marginBottom: 32,
            animation: 'fadeUpFast 0.6s ease-out',
          }}>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20,
              background: 'rgba(232,160,96,0.1)', border: '1px solid rgba(232,160,96,0.2)',
              fontSize: 10, fontWeight: 700, color: C.amber,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
            }}>
              {'\u{1F3C6}'} Game Over
            </span>

            {winner && (
              <>
                {/* Winner avatar */}
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
                  background: winner.avatar_color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 34, fontWeight: 800,
                  boxShadow: `0 8px 32px ${winner.avatar_color}40`,
                  animation: 'winnerPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  {winner.avatar_initial}
                </div>
                <h1 style={{
                  fontSize: 28, fontWeight: 800, color: C.textDark, margin: '0 0 4px',
                }}>
                  {isWinner ? 'You won!' : `${winner.display_name} wins!`}
                </h1>
                <p style={{ fontSize: 14, color: C.textMuted }}>
                  {winner.score} points &middot; {winner.correct_count} correct answers
                  {winner.fastest_answer_seconds != null && (
                    <> &middot; Fastest: {winner.fastest_answer_seconds.toFixed(1)}s</>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Final standings */}
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            marginBottom: 24,
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700, color: C.textDark, margin: '0 0 14px',
            }}>
              Final Standings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sorted.map((p, i) => {
                const isMe = p.id === currentPlayer?.id;
                const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `#${i + 1}`;

                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: isMe ? C.pinkLight : i === 0 ? 'rgba(232,160,96,0.06)' : C.bg,
                    border: `1px solid ${isMe ? C.pinkBorder : i === 0 ? 'rgba(232,160,96,0.15)' : 'transparent'}`,
                  }}>
                    {/* Rank */}
                    <span style={{
                      fontSize: i < 3 ? 16 : 11, fontWeight: 700,
                      color: i >= 3 ? C.textLight : undefined,
                      width: 26, textAlign: 'center',
                    }}>
                      {medal}
                    </span>

                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: p.avatar_color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, flexShrink: 0,
                    }}>
                      {p.avatar_initial}
                    </div>

                    {/* Name + stats */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isMe ? 700 : 600, color: C.textDark,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {p.display_name}
                        {isMe && (
                          <span style={{
                            fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                            background: C.pinkLight, color: C.pink,
                          }}>you</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>
                        {p.correct_count} correct
                        {p.fastest_answer_seconds != null && (
                          <> &middot; fastest {p.fastest_answer_seconds.toFixed(1)}s</>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 20, fontWeight: 800, color: C.textDark,
                        fontFamily: 'monospace',
                      }}>
                        {p.score}
                      </span>
                      <div style={{
                        marginTop: 2, height: 4, width: 60, borderRadius: 2,
                        background: C.borderLight, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${Math.min(100, (p.score / BATTLE_WIN_SCORE) * 100)}%`,
                          background: i === 0
                            ? `linear-gradient(90deg, ${C.amber}, #f0c060)`
                            : p.avatar_color,
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/battle" style={{
              padding: '12px 24px', borderRadius: 12,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
              color: C.textDark, fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
            }}>
              Back to hub
            </Link>
            <Link href="/battle/create" style={{
              padding: '12px 24px', borderRadius: 12,
              background: C.pink, color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(212,83,126,0.25)',
            }}>
              Play again
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUpFast {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes winnerPop {
          0% { transform: scale(0.4); }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
