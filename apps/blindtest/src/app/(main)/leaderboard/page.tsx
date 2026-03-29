'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

type Period = 'today' | 'weekly' | 'alltime';

interface LeaderboardEntry {
  player_id: string;
  username: string;
  avatar_bg: string;
  avatar_text: string;
  level: number;
  total_points: number;
}

const MODE_FILTERS = [
  { id: null, label: 'All modes' },
  { id: 'classic', label: 'Classic' },
  { id: 'intro-challenge', label: 'Intro' },
  { id: 'speed-round', label: 'Speed' },
  { id: 'daily', label: 'Daily' },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Period>('today');
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period: tab });
    if (modeFilter) params.set('mode', modeFilter);

    fetch(`/api/leaderboard?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, modeFilter]);

  return (
    <div className="pt-5 pb-8">
      <p className="text-xl font-semibold mb-4">Leaderboard</p>

      {/* Period tabs */}
      <div className="flex bg-bg-secondary rounded-xl overflow-hidden mb-4 shadow-card">
        {([
          { key: 'today' as const, label: 'Today' },
          { key: 'weekly' as const, label: 'This week' },
          { key: 'alltime' as const, label: 'All time' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-pink-400 bg-bg-tertiary' : 'text-text-tertiary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mode filter chips */}
      {tab === 'today' && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          {MODE_FILTERS.map(m => (
            <button
              key={m.id ?? 'all'}
              onClick={() => setModeFilter(m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                modeFilter === m.id
                  ? 'bg-pink-400 text-bg-primary'
                  : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : (
        <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden">
          {entries.length > 0 ? (
            entries.map((entry, i) => (
              <Link
                key={entry.player_id}
                href={`/player/${entry.username}`}
                className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border-default last:border-b-0 hover:bg-bg-tertiary transition-colors"
              >
                <span className={`text-xs font-semibold w-6 text-center ${
                  i === 0 ? 'text-streak'
                    : i === 1 ? 'text-text-secondary'
                    : i === 2 ? 'text-wrong'
                    : 'text-text-tertiary'
                }`}>
                  {i + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: entry.avatar_bg, color: entry.avatar_text }}
                >
                  {entry.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{entry.username}</span>
                  <span className="text-[10px] text-text-tertiary">Lv.{entry.level}</span>
                </div>
                <span className="text-xs font-medium text-pink-400">
                  {entry.total_points.toLocaleString()} pts
                </span>
              </Link>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-text-tertiary">No plays yet</p>
              <p className="text-xs text-text-ghost mt-1">Be the first to set a score</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border-default last:border-b-0">
          <div className="w-6 h-4 bg-bg-tertiary rounded animate-pulse" />
          <div className="w-7 h-7 bg-bg-tertiary rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="w-24 h-3 bg-bg-tertiary rounded animate-pulse mb-1" />
            <div className="w-12 h-2.5 bg-bg-tertiary rounded animate-pulse" />
          </div>
          <div className="w-16 h-3 bg-bg-tertiary rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
