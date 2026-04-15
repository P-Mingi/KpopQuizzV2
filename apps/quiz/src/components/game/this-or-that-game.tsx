'use client';

import { useState, useEffect, useCallback } from 'react';
import { playPick, playEliminate, playNextMatchup, playVictory } from '@/lib/sounds';
import type { TotCategoryWithItems, TotItem, TotBracketEntry } from '@/lib/db/types';

// ============================================
// Types
// ============================================

type Phase = 'start' | 'playing' | 'result';
type AnimState = 'idle' | 'picked' | 'transitioning';

// ============================================
// Color palette (hardcoded dark theme)
// ============================================

const C = {
  bg: '#0C0C0E',
  surface: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  textGhost: 'rgba(255,255,255,0.35)',
  accent: '#D4537E',
  accentBg: 'rgba(212,83,126,0.18)',
} as const;

// ============================================
// Inline keyframes (injected once)
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
  `;
  document.head.appendChild(style);
}

// ============================================
// Helpers
// ============================================

function getRoundLabel(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  if (remaining === 1) return 'THE FINAL';
  if (remaining === 2) return 'SEMI-FINAL';
  if (remaining === 3) return 'QUARTER-FINAL';
  return `ROUND OF ${Math.pow(2, remaining)}`;
}

function computeTotalMatchups(poolSize: number): number {
  // 16 items = 8 + 4 + 2 + 1 = 15 matchups
  // poolSize items = poolSize - 1 matchups total
  return Math.max(poolSize - 1, 0);
}

function computeGlobalMatchIndex(
  bracket: TotItem[][],
  currentRound: number,
  currentMatchIndex: number,
): number {
  let count = 0;
  for (let r = 0; r < currentRound; r++) {
    count += Math.floor((bracket[r]?.length ?? 0) / 2);
  }
  return count + currentMatchIndex;
}

function computeTotalRounds(poolSize: number): number {
  // 16 -> 4 rounds (R16, QF, SF, F)
  return Math.ceil(Math.log2(poolSize));
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
  // ---- Phase state ----
  const [phase, setPhase] = useState<Phase>('start');

  // ---- Bracket state ----
  const [bracket, setBracket] = useState<TotItem[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [nextRoundItems, setNextRoundItems] = useState<TotItem[]>([]);
  const [matchResults, setMatchResults] = useState<TotBracketEntry[]>([]);
  const [winner, setWinner] = useState<TotItem | null>(null);

  // ---- Animation state ----
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [pickedSide, setPickedSide] = useState<0 | 1 | null>(null);

  // ---- Sound state ----
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ---- Mobile detection ----
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    injectKeyframes();
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ---- Derived values ----
  const poolSize = bracket[0]?.length ?? 16;
  const totalMatchups = computeTotalMatchups(poolSize);
  const totalRounds = computeTotalRounds(poolSize);
  const globalMatchIndex = computeGlobalMatchIndex(bracket, currentRound, currentMatchIndex);

  const currentRoundItems = bracket[currentRound] ?? [];
  const itemA = currentRoundItems[currentMatchIndex * 2] ?? null;
  const itemB = currentRoundItems[currentMatchIndex * 2 + 1] ?? null;
  const isLastMatch = globalMatchIndex === totalMatchups - 1;

  // ---- Actions ----

  const startGame = useCallback(() => {
    // Fisher-Yates shuffle for unbiased randomization
    const shuffled = [...category.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    // Deduplicate by id to ensure each idol appears only once
    const seen = new Set<string>();
    const unique = shuffled.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    const pool = unique.slice(0, Math.min(16, unique.length));
    setBracket([pool]);
    setCurrentRound(0);
    setCurrentMatchIndex(0);
    setNextRoundItems([]);
    setMatchResults([]);
    setWinner(null);
    setPickedSide(null);
    setAnimState('idle');
    setPhase('playing');
  }, [category.items]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  const quit = useCallback(() => {
    setPhase('start');
  }, []);

  const toggleSoundState = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const handlePick = useCallback(
    (sideIndex: 0 | 1) => {
      if (animState !== 'idle') return;
      if (!itemA || !itemB) return;

      const pickedWinner = sideIndex === 0 ? itemA : itemB;
      const loser = sideIndex === 0 ? itemB : itemA;

      setPickedSide(sideIndex);
      setAnimState('picked');
      if (soundEnabled) playPick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }

      // Record this matchup
      const newEntry: TotBracketEntry = {
        winner_id: pickedWinner.id,
        loser_id: loser.id,
        round: currentRound,
      };
      const updatedResults = [...matchResults, newEntry];
      setMatchResults(updatedResults);

      // Add winner to next round pool
      const newNextRound = [...nextRoundItems, pickedWinner];
      setNextRoundItems(newNextRound);

      // Eliminate sound after short delay
      setTimeout(() => {
        if (soundEnabled) playEliminate();
      }, 200);

      // After animation delay, advance
      setTimeout(() => {
        setAnimState('transitioning');

        setTimeout(() => {
          const pairsInRound = Math.floor(currentRoundItems.length / 2);

          if (currentMatchIndex + 1 < pairsInRound) {
            // Next match in same round
            setCurrentMatchIndex((prev) => prev + 1);
          } else if (newNextRound.length > 1) {
            // Advance to next round
            setBracket((prev) => [...prev, newNextRound]);
            setCurrentRound((prev) => prev + 1);
            setCurrentMatchIndex(0);
            setNextRoundItems([]);
          } else {
            // Tournament complete!
            setWinner(pickedWinner);
            setPhase('result');
            if (soundEnabled) playVictory();
            saveResult(category.id, pickedWinner.id, updatedResults);
            return;
          }

          setPickedSide(null);
          setAnimState('idle');
          if (soundEnabled) playNextMatchup();
        }, 300);
      }, 750);
    },
    [
      animState,
      itemA,
      itemB,
      soundEnabled,
      currentRound,
      matchResults,
      nextRoundItems,
      currentRoundItems,
      currentMatchIndex,
      category.id,
    ],
  );

  // ============================================
  // START SCREEN
  // ============================================

  if (phase === 'start') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: C.bg,
          position: 'relative',
        }}
      >
        {/* Close button */}
        <a
          href="/games/this-or-that"
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.surface,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <span style={{ color: C.textSecondary, fontSize: 16, lineHeight: 1 }}>X</span>
        </a>

        {/* VS circle */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `2px solid ${C.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>VS</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: C.text,
            margin: 0,
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          This or that
        </h1>
        <p
          style={{
            fontSize: 14,
            color: C.textGhost,
            margin: 0,
            textAlign: 'center',
          }}
        >
          {category.subtitle}
        </p>

        {/* Pool info */}
        <p
          style={{
            fontSize: 12,
            color: C.textSecondary,
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          {category.pool_size} in pool / {Math.min(16, category.items.length)} per game /{' '}
          {computeTotalMatchups(Math.min(16, category.items.length))} matchups
        </p>

        {/* Start button */}
        <button
          onClick={startGame}
          style={{
            background: C.accent,
            color: '#fff',
            border: 'none',
            padding: '14px 48px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            marginTop: 32,
            cursor: 'pointer',
          }}
        >
          Start tournament
        </button>
      </div>
    );
  }

  // ============================================
  // RESULT SCREEN
  // ============================================

  if (phase === 'result' && winner) {
    const winRate = Math.round(
      (winner.pick_count / Math.max(winner.appear_count, 1)) * 100,
    );

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: C.bg,
          animation: 'totFadeIn 500ms ease-out',
        }}
      >
        {/* Label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2,
            color: C.textGhost,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          YOUR NUMBER ONE
        </p>

        {/* Winner avatar */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${C.accent}`,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {winner.image_url ? (
            <img
              src={winner.image_url}
              alt={winner.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: winner.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                {winner.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {/* Pulsing glow ring */}
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: '2px solid rgba(212,83,126,0.4)',
              animation: 'totPulse 2.5s infinite',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Winner name */}
        <h2
          style={{
            fontSize: 28,
            fontWeight: 600,
            marginTop: 16,
            marginBottom: 2,
            color: C.text,
          }}
        >
          {winner.name}
        </h2>
        <p style={{ fontSize: 14, color: C.textGhost, margin: 0 }}>
          {winner.subtitle}
        </p>

        {/* Round count */}
        <p style={{ fontSize: 12, color: C.accent, marginTop: 8 }}>
          Survived {bracket.length} rounds
        </p>

        {/* Community stat */}
        <div style={{ marginTop: 24, width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 11, color: C.textGhost, marginBottom: 6 }}>
            {winRate}% also picked {winner.name}
          </p>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: C.surface,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: C.accent,
                width: `${winRate}%`,
                transition: 'width 1s ease-out',
              }}
            />
          </div>
        </div>

        {/* Bracket journey */}
        <div style={{ marginTop: 32, width: '100%', maxWidth: 300 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.textGhost,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Bracket journey
          </p>
          {matchResults.slice(-4).map((entry, i) => {
            const w = category.items.find((it) => it.id === entry.winner_id);
            const l = category.items.find((it) => it.id === entry.loser_id);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.accent, fontWeight: 500 }}>{w?.name}</span>
                <span style={{ color: C.textGhost }}>vs</span>
                <span
                  style={{
                    color: C.textSecondary,
                    textDecoration: 'line-through',
                    opacity: 0.5,
                  }}
                >
                  {l?.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 24,
            fontSize: 11,
            color: C.textSecondary,
          }}
        >
          <span>{matchResults.length} Matchups</span>
          <span>{bracket.length} Rounds</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={playAgain}
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              background: C.accent,
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Play again
          </button>
          <a
            href="/games/this-or-that"
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              background: C.surface,
              color: '#fff',
              border: `1px solid ${C.border}`,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Back
          </a>
        </div>
      </div>
    );
  }

  // ============================================
  // PLAYING SCREEN
  // ============================================

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Close */}
        <button
          onClick={quit}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.surface,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ color: C.textSecondary, fontSize: 16, lineHeight: 1 }}>X</span>
        </button>

        {/* Round + match */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: C.textGhost,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {getRoundLabel(currentRound, totalRounds)}
          </p>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: 0 }}>
            {globalMatchIndex + 1} / {totalMatchups}
          </p>
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSoundState}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.surface,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          {soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
        </button>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          padding: '0 16px 8px',
        }}
      >
        {Array.from({ length: totalMatchups }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                i < globalMatchIndex
                  ? C.accent
                  : i === globalMatchIndex
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.1)',
              transform: i === globalMatchIndex ? 'scale(1.3)' : 'scale(1)',
              transition: 'all 300ms',
            }}
          />
        ))}
      </div>

      {/* VS area */}
      {itemA && itemB && (
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flex: 1,
            position: 'relative',
          }}
        >
          {[itemA, itemB].map((item, sideIndex) => (
            <div
              key={`${currentRound}-${currentMatchIndex}-${sideIndex}`}
              onClick={() => handlePick(sideIndex as 0 | 1)}
              style={{
                flex: 1,
                position: 'relative',
                cursor: animState === 'idle' ? 'pointer' : 'default',
                overflow: 'hidden',
                minHeight: isMobile ? 260 : 400,
                background: item.color,
                filter:
                  animState === 'picked' && pickedSide !== sideIndex
                    ? 'grayscale(0.7) brightness(0.4)'
                    : 'none',
                opacity:
                  animState === 'picked' && pickedSide !== sideIndex ? 0.5 : 1,
                transition: 'filter 200ms, opacity 200ms',
              }}
            >
              {/* Photo or initials placeholder */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 72,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Gradient overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: `linear-gradient(transparent, ${item.color})`,
                  pointerEvents: 'none',
                }}
              />

              {/* Pink tint when picked */}
              {animState === 'picked' && pickedSide === sideIndex && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(212,83,126,0.15)',
                    zIndex: 5,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Info overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 16,
                  zIndex: 8,
                  pointerEvents: 'none',
                }}
              >
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#fff',
                    marginBottom: 2,
                    margin: 0,
                  }}
                >
                  {item.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 8,
                    margin: '0 0 8px 0',
                  }}
                >
                  {item.subtitle}
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.1)',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Check badge when picked */}
              {animState === 'picked' && pickedSide === sideIndex && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    zIndex: 10,
                    animation: 'totBounceIn 400ms ease-out',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: C.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Hover glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'transparent',
                  transition: 'background 150ms',
                  zIndex: 9,
                }}
                onMouseEnter={(e) => {
                  if (animState === 'idle') {
                    (e.target as HTMLElement).style.background =
                      'rgba(255,255,255,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                }}
              />
            </div>
          ))}

          {/* VS divider */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              zIndex: 15,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.bg,
              border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {isLastMatch ? 'FINAL' : 'VS'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
