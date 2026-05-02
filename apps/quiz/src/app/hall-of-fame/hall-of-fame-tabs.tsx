'use client';

import { useState } from 'react';
import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { formatCount } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

import type { TopCreator } from '@/lib/db/types';
import type { TopCreatorAllTime, TopPlayer } from '@/lib/db/queries/profiles';

type TabKey = 'weekly' | 'alltime' | 'players';

interface Props {
  weekly: TopCreator[];
  allTime: TopCreatorAllTime[];
  topPlayers: TopPlayer[];
}

export function HallOfFameTabs({ weekly, allTime, topPlayers }: Props): React.ReactElement {
  const [tab, setTab] = useState<TabKey>('weekly');

  const scopes: Array<{ id: TabKey; label: string }> = [
    { id: 'weekly', label: 'This week' },
    { id: 'alltime', label: 'All time' },
    { id: 'players', label: 'Top players' },
  ];

  return (
    <div>
      {/* Scope pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {scopes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setTab(s.id)}
            style={{
              padding: '6px 14px', borderRadius: 9999,
              border: `1px solid ${tab === s.id ? 'var(--text-primary)' : 'var(--border)'}`,
              background: tab === s.id ? 'var(--text-primary)' : 'var(--bg-surface)',
              color: tab === s.id ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'weekly' && <LeaderboardView entries={weekly.map(toEntry)} statLabel="plays" statKey="weekly_plays" />}
      {tab === 'alltime' && <LeaderboardView entries={allTime.map(toEntryAllTime)} statLabel="total plays" statKey="stat" />}
      {tab === 'players' && <PlayerView players={topPlayers} />}
    </div>
  );
}

// ---- Unified entry for podium/list ----

interface LeaderEntry {
  username: string;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  stat: number;
  sub: string;
}

function toEntry(c: TopCreator): LeaderEntry {
  return {
    username: c.username,
    avatar_url: c.avatar_url,
    avatar_bg: c.avatar_bg,
    avatar_text: c.avatar_text,
    stat: c.weekly_plays ?? 0,
    sub: `${c.total_quizzes_created} quizzes`,
  };
}

function toEntryAllTime(c: TopCreatorAllTime): LeaderEntry {
  return {
    username: c.username,
    avatar_url: c.avatar_url,
    avatar_bg: c.avatar_bg,
    avatar_text: c.avatar_text,
    stat: c.total_plays_received,
    sub: `${c.total_quizzes_created} quizzes`,
  };
}

// ---- Podium + List ----

function LeaderboardView({ entries, statLabel }: { entries: LeaderEntry[]; statLabel: string; statKey: string }) {
  if (entries.length === 0) {
    return <EmptyState message="No data yet." />;
  }

  const podiumEntries = entries.slice(0, 3);
  const restEntries = entries.slice(3);

  // Podium order: [2nd, 1st, 3rd]
  const podiumOrder = podiumEntries.length >= 3
    ? [podiumEntries[1]!, podiumEntries[0]!, podiumEntries[2]!]
    : podiumEntries;
  const podiumRanks = podiumEntries.length >= 3 ? [2, 1, 3] : podiumEntries.map((_, i) => i + 1);

  const heights = [88, 112, 76];
  const colors = ['#B0B0B0', 'var(--accent)', '#CD7F32'];

  return (
    <>
      {/* Podium */}
      {podiumEntries.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
          {podiumOrder.map((entry, i) => {
            const pos = podiumRanks[i]!;
            const heightIdx = pos === 1 ? 1 : pos === 2 ? 0 : 2;
            return (
              <div key={entry.username} style={{ flex: 1, textAlign: 'center', maxWidth: 110 }}>
                <UserAvatar
                  username={entry.username}
                  avatarUrl={entry.avatar_url}
                  bgColor={entry.avatar_bg}
                  textColor={entry.avatar_text}
                  size={pos === 1 ? 64 : 52}
                />
                <div style={{
                  fontSize: 12, fontWeight: 700, marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>@{entry.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {entry.stat.toLocaleString()} {statLabel}
                </div>
                <div style={{
                  height: heights[heightIdx], borderRadius: '12px 12px 0 0',
                  background: `linear-gradient(180deg, ${colors[heightIdx]}, color-mix(in srgb, ${colors[heightIdx]} 60%, var(--bg-primary)))`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 8,
                  color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em',
                }}>{pos}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of list */}
      {restEntries.length > 0 && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 8,
        }}>
          {restEntries.map((entry, i) => (
            <Link
              key={entry.username}
              href={`/u/${entry.username}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                borderRadius: 10, textDecoration: 'none', color: 'inherit',
              }}
            >
              <span style={{
                width: 28, color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums', textAlign: 'center',
              }}>#{i + 4}</span>
              <UserAvatar
                username={entry.username}
                avatarUrl={entry.avatar_url}
                bgColor={entry.avatar_bg}
                textColor={entry.avatar_text}
                size={32}
              />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                @{entry.username}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {entry.stat.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// ---- Player view with XP ----

function PlayerView({ players }: { players: TopPlayer[] }) {
  if (players.length === 0) {
    return <EmptyState message="No players yet." />;
  }

  const podiumPlayers = players.slice(0, 3);
  const restPlayers = players.slice(3);

  const podiumOrder = podiumPlayers.length >= 3
    ? [podiumPlayers[1]!, podiumPlayers[0]!, podiumPlayers[2]!]
    : podiumPlayers;
  const podiumRanks = podiumPlayers.length >= 3 ? [2, 1, 3] : podiumPlayers.map((_, i) => i + 1);

  const heights = [88, 112, 76];
  const colors = ['#B0B0B0', 'var(--accent)', '#CD7F32'];

  return (
    <>
      {podiumPlayers.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
          {podiumOrder.map((player, i) => {
            const pos = podiumRanks[i]!;
            const heightIdx = pos === 1 ? 1 : pos === 2 ? 0 : 2;
            const lvl = getLevelInfo(player.xp);
            const title = getTitleForLevel(lvl.level);
            return (
              <div key={player.username} style={{ flex: 1, textAlign: 'center', maxWidth: 110 }}>
                <UserAvatar
                  username={player.username}
                  avatarUrl={player.avatar_url}
                  bgColor={player.avatar_bg}
                  textColor={player.avatar_text}
                  size={pos === 1 ? 64 : 52}
                />
                <div style={{
                  fontSize: 12, fontWeight: 700, marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>@{player.username}</div>
                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
                  Lv.{lvl.level} {title.en}
                </div>
                <div style={{
                  height: heights[heightIdx], borderRadius: '12px 12px 0 0',
                  background: `linear-gradient(180deg, ${colors[heightIdx]}, color-mix(in srgb, ${colors[heightIdx]} 60%, var(--bg-primary)))`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 8,
                  color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em',
                }}>{pos}</div>
              </div>
            );
          })}
        </div>
      )}

      {restPlayers.length > 0 && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 8,
        }}>
          {restPlayers.map((player, i) => {
            const lvl = getLevelInfo(player.xp);
            const title = getTitleForLevel(lvl.level);
            return (
              <Link
                key={player.username}
                href={`/u/${player.username}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  borderRadius: 10, textDecoration: 'none', color: 'inherit',
                }}
              >
                <span style={{
                  width: 28, color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', textAlign: 'center',
                }}>#{i + 4}</span>
                <UserAvatar
                  username={player.username}
                  avatarUrl={player.avatar_url}
                  bgColor={player.avatar_bg}
                  textColor={player.avatar_text}
                  size={32}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>@{player.username}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                    Lv.{lvl.level} {title.en}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{formatCount(player.xp)}</div>
                  <div style={{
                    fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--text-tertiary)',
                  }}>XP</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: 32,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 14,
    }}>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{message}</p>
    </div>
  );
}
