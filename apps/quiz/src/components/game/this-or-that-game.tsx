'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { playPick, playEliminate, playNextMatchup, playVictory } from '@/lib/sounds';
import type { TotCategoryWithItems, TotItem, TotBracketEntry } from '@/lib/db/types';

// ============================================
// Types
// ============================================

type Phase = 'start' | 'playing' | 'result';
type AnimState = 'idle' | 'picked' | 'transitioning';

// ============================================
// Inline keyframes
// ============================================

const KEYFRAMES_ID = 'tot-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes totBounceIn {
      0% { transform: translate(-50%,-50%) scale(0); opacity: 0; }
      50% { transform: translate(-50%,-50%) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
    }
    @keyframes totPulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    @keyframes totFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes totPopIn {
      0% { transform: scale(0.9); opacity: 0; }
      60% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// Helpers
// ============================================

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ============================================
// Save result to Supabase
// ============================================

async function saveResult(
  categoryId: string,
  winnerId: string,
  results: TotBracketEntry[],
) {
  try {
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const supabase = createBrowserClient();

    await supabase.rpc('increment_tot_category_plays', { p_category_id: categoryId });
    await supabase.rpc('increment_tot_pick', { p_item_id: winnerId });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('tot_plays').insert({
      category_id: categoryId,
      user_id: user?.id || null,
      winner_id: winnerId,
      bracket: results,
    });
  } catch (err) {
    console.error('Failed to save result:', err);
  }
}

// ============================================
// Props
// ============================================

interface ThisOrThatGameProps {
  category: TotCategoryWithItems;
}

// ============================================
// Component
// ============================================

export function ThisOrThatGame({ category }: ThisOrThatGameProps) {
  const [phase, setPhase] = useState<Phase>('start');
  const [queue, setQueue] = useState<TotItem[]>([]);
  const [champ, setChamp] = useState<TotItem | null>(null);
  const [opponent, setOpponent] = useState<TotItem | null>(null);
  const [champSide, setChampSide] = useState<0 | 1>(0);
  const [matchResults, setMatchResults] = useState<TotBracketEntry[]>([]);
  const [winner, setWinner] = useState<TotItem | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [opponentKey, setOpponentKey] = useState(0);
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [pickedSide, setPickedSide] = useState<0 | 1 | null>(null);
  const [soundEnabled] = useState(true);
  const [time, setTime] = useState(60);
  const savedRef = useRef(false);

  useEffect(() => { injectKeyframes(); }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const totalMatchups = Math.max(poolSize - 1, 0);
  const completedMatchups = matchResults.length;

  const leftItem = champSide === 0 ? champ : opponent;
  const rightItem = champSide === 1 ? champ : opponent;

  const startGame = useCallback(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const unique = category.items.filter((item) => {
      if (seenIds.has(item.id)) return false;
      const nameKey = (item.name ?? '').trim().toLowerCase();
      if (nameKey && seenNames.has(nameKey)) return false;
      seenIds.add(item.id);
      if (nameKey) seenNames.add(nameKey);
      return true;
    });

    const targetPoolSize = Math.max(2, Math.min(category.pool_size, unique.length));
    const pool = shuffle(unique).slice(0, targetPoolSize);

    setPoolSize(pool.length);
    setChamp(pool[0]!);
    setOpponent(pool[1]!);
    setChampSide(0);
    setQueue(pool.slice(2));
    setMatchResults([]);
    setWinner(null);
    setPickedSide(null);
    setAnimState('idle');
    setOpponentKey(0);
    setTime(60);
    savedRef.current = false;
    setPhase('playing');
  }, [category.items, category.pool_size]);

  const quit = useCallback(() => { setPhase('start'); }, []);

  const handlePick = useCallback(
    (sideIndex: 0 | 1) => {
      if (animState !== 'idle') return;
      if (!champ || !opponent) return;

      const pickedItem = sideIndex === champSide ? champ : opponent;
      const loserItem = sideIndex === champSide ? opponent : champ;

      setPickedSide(sideIndex);
      setAnimState('picked');
      if (soundEnabled) playPick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);

      const newEntry: TotBracketEntry = {
        winner_id: pickedItem.id,
        loser_id: loserItem.id,
        round: completedMatchups,
      };
      const updatedResults = [...matchResults, newEntry];
      setMatchResults(updatedResults);

      setTimeout(() => { if (soundEnabled) playEliminate(); }, 200);

      setTimeout(() => {
        setAnimState('transitioning');
        setTimeout(() => {
          if (queue.length === 0) {
            setWinner(pickedItem);
            setPhase('result');
            if (soundEnabled) playVictory();
            if (!savedRef.current) {
              savedRef.current = true;
              saveResult(category.id, pickedItem.id, updatedResults);
            }
            return;
          }

          const nextChallenger = queue[0]!;
          const remainingQueue = queue.slice(1);

          setChamp(pickedItem);
          setChampSide(sideIndex);
          setOpponent(nextChallenger);
          setQueue(remainingQueue);
          setOpponentKey((k) => k + 1);
          setPickedSide(null);
          setAnimState('idle');
          if (soundEnabled) playNextMatchup();
        }, 300);
      }, 750);
    },
    [animState, champ, opponent, champSide, soundEnabled, completedMatchups, matchResults, queue, category.id],
  );

  // ============================================
  // START SCREEN
  // ============================================

  if (phase === 'start') {
    const previewPoolSize = Math.min(category.pool_size, category.items.length);
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>VS</span>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em',
          lineHeight: 1.05, margin: 0, marginBottom: 6, textAlign: 'center',
        }}>This or that</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
          {category.subtitle}
        </p>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 24, textAlign: 'center' }}>
          {category.pool_size} in pool / {previewPoolSize} per game / {Math.max(previewPoolSize - 1, 0)} matchups
        </p>

        <button onClick={startGame} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '14px 48px', borderRadius: 12, fontSize: 15, fontWeight: 600,
          marginTop: 32, cursor: 'pointer', fontFamily: 'inherit',
        }}>Start tournament</button>
      </div>
    );
  }

  // ============================================
  // RESULT SCREEN
  // ============================================

  if (phase === 'result' && winner) {
    const winRate = Math.round((winner.pick_count / Math.max(winner.appear_count, 1)) * 100);

    return (
      <div style={{
        paddingTop: 24, textAlign: 'center',
        animation: 'totFadeIn 500ms ease-out',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8,
        }}>Your number one</div>

        <div style={{
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
          border: '4px solid var(--accent)',
          margin: '0 auto 16px', position: 'relative',
          boxShadow: 'var(--shadow-lift)',
        }}>
          {winner.image_url ? (
            <img src={winner.image_url} alt={winner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: winner.color || 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.2)' }}>
                {winner.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>
          {winner.name}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{winner.subtitle}</p>
        <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
          Survived {matchResults.length} matchups
        </p>

        <div style={{ marginTop: 24, maxWidth: 300, margin: '24px auto 0' }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
            {winRate}% also picked {winner.name}
          </p>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: 'var(--accent)',
              width: `${winRate}%`, transition: 'width 1s ease-out',
            }} />
          </div>
        </div>

        {/* Bracket journey */}
        <div style={{ marginTop: 32, maxWidth: 300, margin: '32px auto 0', textAlign: 'left' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
          }}>Bracket journey</p>
          {matchResults.slice(-4).map((entry, i) => {
            const w = category.items.find((it) => it.id === entry.winner_id);
            const l = category.items.find((it) => it.id === entry.loser_id);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 8, fontSize: 12,
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{w?.name}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>vs</span>
                <span style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', opacity: 0.5 }}>{l?.name}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <button onClick={startGame} style={{
            padding: '12px 32px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Play again</button>
          <a href="/games/this-or-that" style={{
            padding: '12px 32px', borderRadius: 10,
            background: 'transparent', color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            display: 'flex', alignItems: 'center',
          }}>Back</a>
        </div>
      </div>
    );
  }

  // ============================================
  // PLAYING SCREEN (Claude design)
  // ============================================

  if (!leftItem || !rightItem) return null;

  return (
    <div style={{ paddingTop: 12 }}>
      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={quit} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {' '}Quit
        </button>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--accent)',
        }}>Round {completedMatchups + 1} of {totalMatchups}</div>
        <div style={{
          fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
          padding: '4px 10px', borderRadius: 9999,
          background: time < 10 ? 'var(--wrong-bg)' : 'var(--bg-elevated)',
          color: time < 10 ? 'var(--wrong)' : 'var(--text-primary)',
        }}>0:{String(time).padStart(2, '0')}</div>
      </div>

      {/* Segmented progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
        {Array.from({ length: totalMatchups }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 9999,
            background: i < completedMatchups ? 'var(--accent)' : i === completedMatchups ? 'var(--accent-light)' : 'var(--border)',
          }} />
        ))}
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
        textAlign: 'center', marginBottom: 4,
      }}>Who would you stan?</h2>
      <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 18 }}>
        Tap a side. No takebacks.
      </p>

      {/* Stacked split card with diagonal divider */}
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        border: '1px solid var(--border)', background: 'var(--bg-surface)',
        height: 460,
        boxShadow: '0 24px 60px -28px rgba(0,0,0,0.25)',
      }}>
        {[
          { item: leftItem, sideIndex: 0 as const, isTop: true },
          { item: rightItem, sideIndex: 1 as const, isTop: false },
        ].map(({ item, sideIndex, isTop }) => {
          const isPicked = pickedSide === sideIndex;
          const isFaded = pickedSide !== null && pickedSide !== sideIndex;
          const baseColor = item.color || (isTop ? '#6E6C64' : '#ADAA9F');

          return (
            <button
              key={sideIndex === champSide ? `champ-${item.id}` : `opp-${opponentKey}`}
              onClick={() => handlePick(sideIndex)}
              disabled={animState !== 'idle'}
              style={{
                position: 'absolute',
                left: 0, right: 0,
                top: isTop ? 0 : '50%',
                bottom: isTop ? '50%' : 0,
                background: `linear-gradient(${isTop ? '160deg' : '20deg'}, ${baseColor}, color-mix(in srgb, ${baseColor} 50%, #000))`,
                border: 0, padding: 0,
                cursor: animState === 'idle' ? 'pointer' : 'default',
                transition: 'transform 220ms ease, opacity 220ms',
                transform: isPicked ? 'scale(1.02)' : 'scale(1)',
                opacity: isFaded ? 0.35 : 1,
                overflow: 'hidden',
                fontFamily: 'inherit',
                borderBottom: isTop ? '1px solid rgba(255,255,255,0.15)' : 'none',
              }}
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  objectPosition: 'center 30%',
                }} />
              ) : null}
              {/* Subtle color tint overlay instead of desaturation */}
              <div style={{
                position: 'absolute', inset: 0,
                background: item.image_url
                  ? (isTop
                    ? `linear-gradient(180deg, ${baseColor}55 0%, transparent 40%, ${baseColor}dd 100%)`
                    : `linear-gradient(0deg, ${baseColor}55 0%, transparent 40%, ${baseColor}dd 100%)`)
                  : 'none',
              }} />

              {/* Side label */}
              <div style={{
                position: 'absolute',
                ...(isTop ? { bottom: 16 } : { top: 16 }),
                left: 20, right: 20,
                color: '#fff', textAlign: 'left',
                zIndex: 2,
              }}>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>{isTop ? 'Pick A' : 'Pick B'}</div>
                <div style={{
                  fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em',
                  marginTop: 6, lineHeight: 1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>{item.name}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, opacity: 0.9,
                  marginTop: 4, letterSpacing: '0.04em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}>{item.subtitle}</div>
              </div>

              {/* Check indicator on pick */}
              {isPicked && (
                <div style={{
                  position: 'absolute',
                  top: '50%', transform: 'translateY(-50%)',
                  right: 20, width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', color: baseColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'totPopIn 200ms ease-out',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 10,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}

        {/* VS badge */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-12deg)',
          zIndex: 15, width: 72, height: 72, borderRadius: '50%',
          background: 'var(--bg-primary)',
          border: '3px solid var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          fontStyle: 'italic',
        }}>VS</div>
      </div>

      {/* Tip strip */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 12,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 12, color: 'var(--text-secondary)',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 11, fontWeight: 800,
        }}>i</span>
        Picks are anonymous and contribute to community taste data.
      </div>
    </div>
  );
}
