'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

type Tab = 'alltime' | 'weekly' | 'group';

interface LeaderboardEntry {
  player_id: string;
  username: string;
  avatar_bg: string;
  avatar_text: string;
  level: number;
  total_points: number;
}

const TABS: Array<{ id: Tab; label: string; period?: string }> = [
  { id: 'alltime', label: 'All time', period: 'alltime' },
  { id: 'weekly', label: 'This week', period: 'weekly' },
  { id: 'group', label: 'By group' },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === 'group') {
      setLoading(false);
      setEntries([]);
      return;
    }
    setLoading(true);
    const period = TABS.find((t) => t.id === tab)?.period ?? 'alltime';
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries((data.entries ?? []) as LeaderboardEntry[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  return (
    <div className="pt-3 md:pt-6 pb-8 max-w-[560px] mx-auto">
      <h1 className="text-[22px] font-bold text-primary mb-4">Hall of fame</h1>

      {/* Tab selector */}
      <div className="flex gap-1.5 mb-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 px-3 rounded-[10px] text-xs font-medium border transition-colors ${
                active
                  ? 'bg-accent-bg text-accent border-accent'
                  : 'bg-surface text-ghost border-default'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'group' ? (
        <div className="rounded-[14px] bg-surface border border-default shadow-card py-10 text-center">
          <p className="text-sm text-tertiary">Group leaderboards coming soon</p>
          <p className="text-[11px] text-ghost mt-1">Browse a specific group from the home page in the meantime</p>
          <Link
            href="/"
            className="inline-block mt-3 px-4 py-2 rounded-[10px] bg-elevated text-[12px] text-primary hover:bg-accent-bg transition-colors"
          >
            Back to home
          </Link>
        </div>
      ) : loading ? (
        <LeaderboardSkeleton />
      ) : entries.length > 0 ? (
        <div className="rounded-[14px] bg-surface border border-default shadow-card overflow-hidden">
          {entries.map((entry, i) => {
            const rankColor =
              i === 0 ? 'text-combo'
              : i === 1 ? 'text-secondary'
              : i === 2 ? 'text-streak'
              : 'text-tertiary';
            return (
              <Link
                key={entry.player_id}
                href={`/player/${entry.username}`}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-subtle last:border-0 hover:bg-elevated transition-colors"
              >
                <span className={`text-base font-bold w-7 text-center tabular-nums ${rankColor}`}>
                  {i + 1}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: entry.avatar_bg, color: entry.avatar_text }}
                >
                  {entry.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-primary truncate block">{entry.username}</span>
                  <span className="text-[10px] text-ghost">Lv.{entry.level}</span>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-primary tabular-nums">{entry.total_points.toLocaleString()}</p>
                  <p className="text-[9px] text-ghost uppercase tracking-wide">total xp</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] bg-surface border border-default shadow-card py-10 text-center">
          <p className="text-sm text-tertiary">No plays yet</p>
          <p className="text-[11px] text-ghost mt-1">Be the first to set a score</p>
        </div>
      )}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-[14px] bg-surface border border-default shadow-card overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-subtle last:border-0">
          <div className="w-7 h-5 bg-elevated rounded animate-pulse" />
          <div className="w-9 h-9 bg-elevated rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="w-28 h-3 bg-elevated rounded animate-pulse mb-1.5" />
            <div className="w-12 h-2.5 bg-elevated rounded animate-pulse" />
          </div>
          <div className="w-16 h-4 bg-elevated rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
