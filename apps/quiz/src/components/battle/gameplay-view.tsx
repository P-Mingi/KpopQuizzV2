'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';
import type { BattleRoomState } from '@/lib/battle/use-battle-room';
import type { BattlePlayer } from '@/lib/db/types';
import { RoomTopBar } from './room-top-bar';
import { ChatPanel } from './chat-panel';

interface GameplayViewProps {
  state: BattleRoomState;
}

// ── Timer hook: counts down based on server timestamps ──
function useCountdown(endTime: string | null): number {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endTime) { setTimeLeft(0); return; }
    const end = new Date(endTime).getTime();

    const tick = () => {
      const remaining = Math.max(0, (end - Date.now()) / 1000);
      setTimeLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endTime]);

  return timeLeft;
}

// ── Countdown overlay (3, 2, 1, GO!) ──
function CountdownOverlay({ secondsLeft }: { secondsLeft: number }): React.ReactElement {
  const num = Math.ceil(secondsLeft);
  const isGo = num <= 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'linear-gradient(160deg, #1a0a1e 0%, #2a1035 60%, #3a1848 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
      }}>
        Round starting &middot; Get ready
      </p>
      <div style={{
        width: 130, height: 130, borderRadius: '50%',
        border: `3px solid ${isGo ? C.green : C.pink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'countRing 1s ease-out',
      }}>
        <span style={{
          fontSize: isGo ? 48 : 80, fontWeight: 800,
          color: isGo ? C.green : '#fff',
          textShadow: `0 0 40px ${isGo ? 'rgba(39,174,96,0.5)' : 'rgba(212,83,126,0.4)'}`,
          animation: 'countNum 0.8s ease-out',
        }}>
          {isGo ? 'GO!' : num}
        </span>
      </div>

      <style>{`
        @keyframes countNum {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes countRing {
          0% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Question display ──
function QuestionDisplay({ prompt, textContent, imageUrl }: {
  prompt: string; textContent: string | null; imageUrl: string | null;
}): React.ReactElement {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      {/* Question type tag */}
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: 8,
        background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
        fontSize: 11, fontWeight: 700, color: C.pink, marginBottom: 16,
      }}>
        {imageUrl ? '\u{1F4F8} Photo Question' : '\u{1F3A4} Text Question'}
      </span>

      {/* Prompt */}
      <h2 style={{
        fontSize: 16, fontWeight: 700, color: C.textDark,
        margin: '0 0 16px',
      }}>
        {prompt}
      </h2>

      {/* Text content (lyric, quote, etc.) */}
      {textContent && (
        <div style={{
          position: 'relative', padding: '24px 20px', borderRadius: 16,
          background: '#fff', border: `1.5px solid ${C.pinkBorder}`,
          boxShadow: '0 4px 24px rgba(212,83,126,0.06)',
        }}>
          {/* Decorative quotes */}
          <span style={{
            position: 'absolute', top: 8, left: 14,
            fontSize: 40, color: C.pinkLight, fontStyle: 'italic', lineHeight: 1,
          }}>&ldquo;</span>
          <p style={{
            fontSize: 22, fontWeight: 600, fontStyle: 'italic',
            color: C.textDark, lineHeight: 1.5, margin: 0,
            position: 'relative', zIndex: 1,
          }}>
            {textContent}
          </p>
          <span style={{
            position: 'absolute', bottom: 4, right: 14,
            fontSize: 40, color: C.pinkLight, fontStyle: 'italic', lineHeight: 1,
          }}>&rdquo;</span>
        </div>
      )}

      {/* Image content */}
      {imageUrl && (
        <div style={{
          width: 280, height: 280, margin: '0 auto', borderRadius: 16,
          border: `2px solid ${C.pinkBorder}`,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          boxShadow: '0 4px 24px rgba(212,83,126,0.15)',
        }} />
      )}
    </div>
  );
}

// ── Timer bar ──
function TimerBar({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }): React.ReactElement {
  const pct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const color = pct > 50 ? C.green : pct > 25 ? C.amber : C.red;

  return (
    <div style={{ maxWidth: 600, margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12 }}>{'\u23F1'}</span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: C.borderLight, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}40`,
          transition: 'width 0.1s linear',
        }} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
        color, minWidth: 40, textAlign: 'right',
      }}>
        {timeLeft.toFixed(1)}s
      </span>
    </div>
  );
}

// ── Answer input ──
function AnswerInput({ onSubmit, disabled, feedback }: {
  onSubmit: (text: string) => void;
  disabled: boolean;
  feedback: 'correct' | 'wrong' | null;
}): React.ReactElement {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when not disabled
  useEffect(() => {
    if (!disabled && inputRef.current) inputRef.current.focus();
  }, [disabled]);

  // Clear input on new round (when disabled resets)
  useEffect(() => {
    if (!disabled) setValue('');
  }, [disabled]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
  };

  const borderColor = feedback === 'correct' ? C.green
    : feedback === 'wrong' ? C.red
    : value ? C.pink : C.cardBorder;

  return (
    <div style={{ maxWidth: 600, margin: '16px auto 0' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          disabled={disabled}
          placeholder={disabled ? 'Waiting for next round...' : 'Type your answer...'}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 12,
            border: `2px solid ${borderColor}`,
            fontSize: 15, fontWeight: 500, color: C.textDark,
            outline: 'none', transition: 'border-color 0.15s',
            boxShadow: value ? '0 4px 14px rgba(212,83,126,0.1)' : 'none',
            animation: feedback === 'wrong' ? 'shakeIt 0.4s ease-out' : 'none',
            background: disabled ? C.bg : '#fff',
          }}
          aria-label="Your answer"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          style={{
            padding: '14px 24px', borderRadius: 12, border: 'none',
            background: value.trim() && !disabled ? C.pink : C.bg,
            color: value.trim() && !disabled ? '#fff' : C.textLight,
            fontSize: 14, fontWeight: 700,
            cursor: value.trim() && !disabled ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          Submit
        </button>
      </div>
      <p style={{ fontSize: 10, color: C.textLight, textAlign: 'center', marginTop: 6 }}>
        {'\u{1F4A1}'} Typos OK &middot; Korean and English both accepted
      </p>

      <style>{`
        @keyframes shakeIt {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

// ── Answer feedback overlay ──
function AnswerFeedback({ type, points, timeTaken }: {
  type: 'correct' | 'wrong';
  points: number;
  timeTaken: number;
}): React.ReactElement {
  if (type === 'correct') {
    return (
      <div style={{
        textAlign: 'center', padding: '20px 0',
        animation: 'fadeUpFast 0.4s ease-out',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
          background: `linear-gradient(135deg, ${C.green}, #76c893)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${C.green}40`,
          animation: 'correctPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <span style={{ fontSize: 28, color: '#fff' }}>{'\u2713'}</span>
        </div>
        <p style={{ fontSize: 32, fontWeight: 800, color: C.green, margin: '0 0 4px' }}>
          +{points} <span style={{ fontSize: 18 }}>pts</span>
        </p>
        <p style={{ fontSize: 12, color: C.textMuted }}>
          answered in {timeTaken.toFixed(1)}s
        </p>

        <style>{`
          @keyframes correctPop {
            0% { transform: scale(0.4) rotate(-10deg); }
            60% { transform: scale(1.1) rotate(3deg); }
            100% { transform: scale(1) rotate(0); }
          }
          @keyframes fadeUpFast {
            0% { transform: translateY(8px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      textAlign: 'center', padding: '12px 0',
      animation: 'fadeUpFast 0.3s ease-out',
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
        Not quite! Keep trying
      </p>
      <style>{`
        @keyframes fadeUpFast {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Live update: who answered ──
function LiveUpdates({ answers, players }: {
  answers: { player_id: string; is_correct: boolean; time_taken_seconds: number | null }[];
  players: BattlePlayer[];
}): React.ReactElement {
  const correctAnswers = answers.filter(a => a.is_correct);
  if (correctAnswers.length === 0) return <div />;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6,
      justifyContent: 'center', marginTop: 12,
    }}>
      {correctAnswers.map(a => {
        const p = players.find(pl => pl.id === a.player_id);
        if (!p) return null;
        return (
          <span key={a.player_id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 12,
            background: 'rgba(39,174,96,0.1)', border: `1px solid rgba(39,174,96,0.2)`,
            fontSize: 10, fontWeight: 600, color: C.green,
            animation: 'fadeUpFast 0.3s ease-out',
          }}>
            {'\u2713'} {p.display_name}
            {a.time_taken_seconds != null && (
              <span style={{ color: C.textMuted }}>&middot; {a.time_taken_seconds.toFixed(1)}s</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Leaderboard sidebar ──
function LeaderboardSidebar({ players, currentPlayerId }: {
  players: BattlePlayer[];
  currentPlayerId: string | null;
}): React.ReactElement {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      padding: '16px 12px', overflowY: 'auto',
      background: C.bg, borderLeft: `1px solid ${C.cardBorder}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, padding: '0 4px',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: C.textLight,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          Leaderboard
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>
          Race to 100
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((p, i) => {
          const isMe = p.id === currentPlayerId;
          const isLeader = i === 0 && p.score > 0;
          const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `#${i + 1}`;

          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 10,
              background: isMe ? C.pinkLight : '#fff',
              border: `1px solid ${isMe ? C.pinkBorder : isLeader ? 'rgba(232,160,96,0.3)' : C.cardBorder}`,
              boxShadow: isLeader ? '0 2px 8px rgba(232,160,96,0.12)' : 'none',
            }}>
              {/* Rank */}
              <span style={{
                fontSize: i < 3 ? 14 : 10, fontWeight: 700,
                color: i < 3 ? undefined : C.textLight,
                width: 22, textAlign: 'center',
              }}>
                {medal}
              </span>

              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: p.avatar_color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>
                {p.avatar_initial}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: isMe ? 700 : 600, color: C.textDark,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  {p.display_name}
                  {isMe && (
                    <span style={{
                      fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                      background: C.pinkLight, color: C.pink,
                    }}>you</span>
                  )}
                </div>
                {/* Score bar */}
                <div style={{
                  marginTop: 3, height: 4, borderRadius: 2,
                  background: C.borderLight, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${Math.min(100, p.score)}%`,
                    background: isLeader
                      ? `linear-gradient(90deg, ${C.amber}, #f0c060)`
                      : `linear-gradient(90deg, ${p.avatar_color}, ${p.avatar_color}cc)`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Score */}
              <span style={{
                fontSize: 16, fontWeight: 800, color: C.textDark,
                fontFamily: 'monospace', minWidth: 28, textAlign: 'right',
              }}>
                {p.score}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ── Main gameplay view ──
export function GameplayView({ state }: GameplayViewProps): React.ReactElement {
  const { room, currentRound, roundQuestion, roundAnswers, players, currentPlayer } = state;
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lastResult, setLastResult] = useState<{ points: number; timeTaken: number } | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);

  // Timer: countdown to round end
  const roundTimeLeft = useCountdown(currentRound?.round_ends_at ?? null);
  const countdownTimeLeft = useCountdown(currentRound?.countdown_ends_at ?? null);
  const totalTime = room?.time_per_round ?? 15;

  // Reset state when round changes
  useEffect(() => {
    setFeedback(null);
    setLastResult(null);
    setAnsweredCorrectly(false);
  }, [currentRound?.id]);

  const handleSubmit = useCallback(async (text: string) => {
    if (answeredCorrectly) return;
    const result = await state.submitAnswer(text);
    if (!result) return;

    if (result.is_correct) {
      setFeedback('correct');
      setAnsweredCorrectly(true);
      setLastResult({ points: result.points, timeTaken: totalTime - roundTimeLeft });
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  }, [state, answeredCorrectly, totalTime, roundTimeLeft]);

  if (!room) return <div />;

  const isCountdown = currentRound?.status === 'countdown' && countdownTimeLeft > 0;
  const isActive = currentRound?.status === 'active' || (currentRound?.status === 'countdown' && countdownTimeLeft <= 0);
  const isReveal = currentRound?.status === 'reveal' || currentRound?.status === 'ended';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: C.bg, position: 'relative',
    }}>
      <RoomTopBar
        room={room}
        currentPlayer={currentPlayer}
        connectionStatus={state.connectionStatus}
      />

      {/* Countdown overlay */}
      {isCountdown && <CountdownOverlay secondsLeft={countdownTimeLeft} />}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Center: Game area */}
        <main style={{
          flex: 1, minWidth: 0, padding: '20px 24px',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Round info */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>
              Round {currentRound?.round_number ?? 1} &middot; {room.difficulty}
            </span>
          </div>

          {/* Question */}
          {roundQuestion && isActive && !answeredCorrectly && (
            <QuestionDisplay
              prompt={roundQuestion.prompt}
              textContent={roundQuestion.text_content}
              imageUrl={roundQuestion.image_url}
            />
          )}

          {/* Correct feedback */}
          {answeredCorrectly && lastResult && (
            <AnswerFeedback
              type="correct"
              points={lastResult.points}
              timeTaken={lastResult.timeTaken}
            />
          )}

          {/* Wrong feedback (momentary) */}
          {feedback === 'wrong' && !answeredCorrectly && (
            <AnswerFeedback type="wrong" points={0} timeTaken={0} />
          )}

          {/* Live updates: who answered */}
          {isActive && (
            <LiveUpdates answers={roundAnswers} players={players} />
          )}

          {/* Reveal screen */}
          {isReveal && (
            <div style={{ textAlign: 'center', padding: '32px 0', animation: 'fadeUpFast 0.5s ease-out' }}>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 8 }}>Round over</p>
              <div style={{
                display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16,
              }}>
                <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                  {roundAnswers.filter(a => a.is_correct).length} got it
                </span>
                <span style={{ fontSize: 12, color: C.textLight }}>&middot;</span>
                <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>
                  {players.length - roundAnswers.filter(a => a.is_correct).length} missed
                </span>
              </div>

              {/* Next round prompt (host) */}
              {state.isHost && (
                <button
                  onClick={state.startRound}
                  style={{
                    marginTop: 24, padding: '12px 28px', borderRadius: 12,
                    background: C.pink, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(212,83,126,0.3)',
                  }}
                >
                  Next round {'\u2192'}
                </button>
              )}
              {!state.isHost && (
                <div style={{
                  marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 12,
                  background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
                }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: C.textLight,
                        animation: `dotBounce 1.4s ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                    Waiting for host...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Timer bar + Answer input (only during active round) */}
          {isActive && (
            <>
              <TimerBar timeLeft={roundTimeLeft} totalTime={totalTime} />
              <AnswerInput
                onSubmit={handleSubmit}
                disabled={answeredCorrectly || roundTimeLeft <= 0}
                feedback={feedback}
              />
            </>
          )}
        </main>

        {/* Right: Leaderboard */}
        <LeaderboardSidebar
          players={players}
          currentPlayerId={currentPlayer?.id ?? null}
        />

        {/* Far right: Chat */}
        <ChatPanel
          messages={state.chatMessages}
          players={players}
          onSend={state.sendChat}
        />
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes fadeUpFast {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
