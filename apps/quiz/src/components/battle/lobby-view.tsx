'use client';

import { useCallback } from 'react';
import { BATTLE_PALETTE as C, BATTLE_MAX_PLAYERS, BATTLE_TIME_OPTIONS } from '@/lib/battle/battle-constants';
import type { BattleRoomState } from '@/lib/battle/use-battle-room';
import type { BattleDifficulty } from '@/lib/db/types';
import { RoomTopBar } from './room-top-bar';
import { PlayerCard } from './player-card';
import { ChatPanel } from './chat-panel';

interface LobbyViewProps {
  state: BattleRoomState;
}

// ── Setting row wrapper ──
function SettingRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, color: C.textLight,
        textTransform: 'uppercase', letterSpacing: 1,
        margin: '0 0 5px',
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Toggle switch ──
function SettingToggle({ on, label, desc, onToggle }: {
  on: boolean; label: string; desc: string; onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      style={{
        flex: 1, padding: '10px 12px', borderRadius: 10,
        background: on ? C.pinkLight : C.bg,
        border: `1px solid ${on ? C.pinkBorder : C.cardBorder}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        textAlign: 'left',
      }}
    >
      {/* Toggle track */}
      <div style={{
        position: 'relative', width: 30, height: 18, borderRadius: 9,
        background: on ? C.pink : C.borderLight,
        flexShrink: 0, transition: 'background 0.15s',
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: on ? 14 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textDark }}>{label}</div>
        <div style={{ fontSize: 9, color: C.textMuted }}>{desc}</div>
      </div>
    </button>
  );
}

// ── Option button (for difficulty, time, etc.) ──
function OptionBtn({ active, label, onClick, variant = 'fill' }: {
  active: boolean; label: string; onClick: () => void; variant?: 'fill' | 'outline';
}): React.ReactElement {
  const isFill = variant === 'fill';
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '7px 0', borderRadius: 8,
        background: active ? (isFill ? C.pink : C.pinkLight) : C.bg,
        color: active ? (isFill ? '#fff' : C.pink) : C.textMuted,
        border: `1px solid ${active ? (isFill ? C.pink : C.pinkBorder) : C.cardBorder}`,
        fontSize: 11, fontWeight: active ? 700 : 500,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── Copy to clipboard helper ──
function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Host lobby: editable settings ──
function HostLobbyContent({ state }: { state: BattleRoomState }): React.ReactElement {
  const room = state.room;
  if (!room) return <div />;

  const code = room.code;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/battle/r/${code}` : '';

  const update = useCallback((key: string, value: unknown) => {
    state.updateSettings({ [key]: value });
  }, [state]);

  return (
    <main style={{ flex: 1, minWidth: 0, padding: '20px 24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Room code card (dark gradient) */}
        <div style={{
          position: 'relative', padding: '20px 24px', borderRadius: 16,
          background: `linear-gradient(135deg, #1a0a1e, #3a1848 60%, ${C.pink})`,
          marginBottom: 18, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 140, height: 140,
            background: 'rgba(255,255,255,0.06)', borderRadius: '50%',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: 2, margin: 0,
            }}>
              ROOM CODE
            </p>
            <p style={{
              fontSize: 56, fontWeight: 800, color: '#fff',
              fontFamily: 'monospace', letterSpacing: 12,
              margin: '2px 0 12px',
            }}>
              {code}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => copyToClipboard(code)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                &#128203; Copy code
              </button>
              <button
                onClick={() => copyToClipboard(shareUrl)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                &#128279; Share link
              </button>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        <div style={{
          padding: '18px 20px', borderRadius: 14, marginBottom: 14,
          background: '#fff', border: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>
              &#9881; Game settings
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              background: 'rgba(232,160,96,0.12)', color: C.amber,
            }}>
              &#128081; Host only
            </span>
          </div>

          {/* Difficulty */}
          <SettingRow label="Difficulty">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['Easy', 'Medium', 'Hard', 'Insane'] as BattleDifficulty[]).map(d => (
                <OptionBtn
                  key={d}
                  active={room.difficulty === d}
                  label={d}
                  onClick={() => update('difficulty', d)}
                />
              ))}
            </div>
          </SettingRow>

          {/* Group filter */}
          <SettingRow label="Group filter">
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { v: 'all', l: 'All groups' },
                { v: 'specific', l: 'Specific groups' },
                { v: 'by_gen', l: 'By generation' },
              ].map(opt => (
                <OptionBtn
                  key={opt.v}
                  active={room.group_filter_mode === opt.v}
                  label={opt.l}
                  onClick={() => update('group_filter_mode', opt.v)}
                  variant="outline"
                />
              ))}
            </div>
          </SettingRow>

          {/* Time per round */}
          <SettingRow label="Time per round">
            <div style={{ display: 'flex', gap: 4 }}>
              {BATTLE_TIME_OPTIONS.map(t => (
                <OptionBtn
                  key={t}
                  active={room.time_per_round === t}
                  label={`${t}s`}
                  onClick={() => update('time_per_round', t)}
                />
              ))}
            </div>
          </SettingRow>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 8 }}>
            <SettingToggle
              on={room.korean_mode}
              label="&#127472;&#127479; Korean mode"
              desc="Accept Korean answers"
              onToggle={() => update('korean_mode', !room.korean_mode)}
            />
            <SettingToggle
              on={room.privacy === 'private'}
              label="&#128274; Private room"
              desc="Only via code"
              onToggle={() => update('privacy', room.privacy === 'private' ? 'public' : 'private')}
            />
          </div>
        </div>

        {/* Rules text */}
        <div style={{
          padding: '16px 18px', borderRadius: 14, marginBottom: 14,
          background: C.bg, border: `1px solid ${C.borderLight}`,
        }}>
          <p style={{ fontSize: 10, color: C.textLight, textAlign: 'center', margin: 0 }}>
            Free-text answers &middot; Fuzzy matching (typos OK) &middot; Points = speed &middot; First to 100 wins
          </p>
        </div>

        {/* Start game button */}
        <button
          onClick={state.startRound}
          disabled={state.players.length < 2}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 14,
            background: state.players.length >= 2 ? C.pink : C.bg,
            color: state.players.length >= 2 ? '#fff' : C.textLight,
            border: 'none', fontSize: 15, fontWeight: 700,
            cursor: state.players.length >= 2 ? 'pointer' : 'default',
            boxShadow: state.players.length >= 2 ? '0 6px 20px rgba(212,83,126,0.35)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {state.players.length < 2 ? 'Need at least 2 players' : 'Start game \u2192'}
        </button>
      </div>
    </main>
  );
}

// ── Player lobby: read-only settings ──
function PlayerLobbyContent({ state }: { state: BattleRoomState }): React.ReactElement {
  const room = state.room;
  if (!room) return <div />;

  const code = room.code;

  return (
    <main style={{ flex: 1, minWidth: 0, padding: '20px 24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Compact code card */}
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 14,
          background: '#fff', border: `1px solid ${C.cardBorder}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <p style={{
            fontSize: 8, fontWeight: 700, color: C.textLight, margin: 0,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Room
          </p>
          <p style={{
            fontSize: 28, fontWeight: 800, color: C.pink, margin: 0,
            fontFamily: 'monospace', letterSpacing: 6,
          }}>
            {code}
          </p>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => copyToClipboard(code)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              color: C.pink, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            &#128203; Copy
          </button>
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/battle/r/${code}` : '';
              copyToClipboard(url);
            }}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              color: C.pink, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            &#128279; Share
          </button>
        </div>

        {/* Read-only settings */}
        <div style={{
          padding: '16px 18px', borderRadius: 14, marginBottom: 14,
          background: C.bg, border: `1px solid ${C.borderLight}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>
              &#9881; Game settings
            </span>
            <span style={{ fontSize: 9, color: C.textLight }}>
              &#128274; Set by host
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { k: 'Difficulty', v: room.difficulty, c: room.difficulty === 'Hard' || room.difficulty === 'Insane' ? C.red : C.textDark },
              { k: 'Groups', v: room.group_filter_mode === 'all' ? 'All groups' : room.group_filter_values.join(', ') || 'Specific', c: C.purple },
              { k: 'Time / round', v: `${room.time_per_round}s`, c: C.amber },
              { k: 'Korean mode', v: room.korean_mode ? 'On' : 'Off', c: C.textMuted },
              { k: 'Privacy', v: room.privacy === 'private' ? '\u{1F512} Private' : 'Public', c: C.textMuted },
            ].map(row => (
              <div key={row.k} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, background: '#fff',
              }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{row.k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: row.c }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Waiting animation */}
        <div style={{
          padding: '16px 0', borderRadius: 14,
          background: C.borderLight, textAlign: 'center',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: C.textLight,
                  animation: `dotBounce 1.4s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>
              Waiting for host to start...
            </span>
          </div>
        </div>

        {/* dotBounce keyframes injected inline */}
        <style>{`
          @keyframes dotBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
            30% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    </main>
  );
}

// ── Player roster sidebar ──
function PlayerRoster({ state }: { state: BattleRoomState }): React.ReactElement {
  const slotsLeft = BATTLE_MAX_PLAYERS - state.players.length;

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 5,
      padding: '16px 12px', overflowY: 'auto',
      background: C.bg, borderLeft: `1px solid ${C.cardBorder}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 4, padding: '0 4px',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: C.textLight,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          Players
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>
          {state.players.length}/{BATTLE_MAX_PLAYERS}
        </span>
      </div>

      {/* Player cards */}
      {state.players.map(p => (
        <PlayerCard
          key={p.id}
          player={p}
          isCurrentUser={p.id === state.currentPlayer?.id}
          canKick={state.isHost}
        />
      ))}

      {/* Slots remaining */}
      {slotsLeft > 0 && (
        <div style={{
          marginTop: 4, padding: 10, borderRadius: 10,
          background: C.pinkLight,
          border: `1px dashed ${C.pinkBorder}`,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 10, color: C.pink, fontWeight: 600 }}>
            &#127903; Up to {slotsLeft} more can join
          </span>
        </div>
      )}
    </aside>
  );
}

// ── Main lobby view ──
export function LobbyView({ state }: LobbyViewProps): React.ReactElement {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: C.bg,
    }}>
      <RoomTopBar
        room={state.room!}
        currentPlayer={state.currentPlayer}
        connectionStatus={state.connectionStatus}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Center: Settings (host) or read-only (player) */}
        {state.isHost ? (
          <HostLobbyContent state={state} />
        ) : (
          <PlayerLobbyContent state={state} />
        )}

        {/* Right: Player roster */}
        <PlayerRoster state={state} />

        {/* Far right: Chat */}
        <ChatPanel
          messages={state.chatMessages}
          players={state.players}
          onSend={state.sendChat}
        />
      </div>
    </div>
  );
}
