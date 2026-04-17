'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { TipBanner } from '@/components/shared/tip-banner';

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

function PodiumCard({ rank, player, height, avatarSize, crown }: { rank: number; player: LeaderboardEntry; height: string; avatarSize: string; crown?: boolean }) {
  const plinthBg = rank === 1 ? 'from-[#D4537E] to-[#993556]' : rank === 2 ? 'from-[#B4B2A9] to-[#888780]' : 'from-[#BA7517] to-[#854F0B]';
  const initial = (player.username || 'P').charAt(0).toUpperCase();
  return (
    <div className="flex flex-col items-center">
      <div className={`${avatarSize} rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] border-2 border-[#D4537E] flex items-center justify-center relative mb-1.5`}>
        <span className="text-sm font-semibold text-[#D4537E]">{initial}</span>
        {crown && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#EF9F27" className="absolute -top-3"><path d="M8 1l2.5 4 4 1.5-3 3 .8 4.2L8 11.5l-4.3 2.2.8-4.2-3-3 4-1.5z" /></svg>
        )}
      </div>
      <p className="text-[10px] md:text-[11px] font-semibold text-primary mb-0.5 truncate max-w-[70px]">{player.username}</p>
      <p className="text-[9px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] tabular-nums mb-1.5">{(player.total_points || 0).toLocaleString()} pts</p>
      <div className={`w-[70px] md:w-[80px] ${height} rounded-t-xl bg-gradient-to-b ${plinthBg} flex items-start justify-center pt-2`}>
        <span className="text-white text-xs font-semibold">{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</span>
      </div>
    </div>
  );
}

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

  const players = entries;

  return (
    <div className="max-w-[600px] mx-auto px-3.5 md:px-7 py-4 md:py-6 relative pb-16">
      {/* Back button + title */}
      <div className="flex items-center gap-2.5 mb-4">
        <Link href="/" className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"><path d="M8 1.5L3 6l5 4.5" /></svg>
        </Link>
        <h1 className="text-base md:text-lg font-medium text-primary">Leaderboard</h1>
      </div>

      {/* Tab pills */}
      <div className="flex gap-[5px] mb-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-[7px] rounded-lg text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-[#D4537E] text-white'
                  : 'bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] text-[#888780] dark:text-[rgba(255,255,255,0.35)]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'group' ? (
        <div className="rounded-2xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] py-10 text-center">
          <p className="text-sm text-[#888780] dark:text-[rgba(255,255,255,0.35)]">Group leaderboards coming soon</p>
          <p className="text-[11px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-1">Browse a specific group from the home page in the meantime</p>
          <Link
            href="/"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] text-[12px] text-primary hover:opacity-80 transition-opacity"
          >
            Back to home
          </Link>
        </div>
      ) : loading ? (
        <LeaderboardSkeleton />
      ) : players.length > 0 ? (
        <>
          {/* Top 3 podium */}
          <div className="flex items-end justify-center gap-2.5 md:gap-4 mt-4 md:mt-6 mb-6">
            {players[1] && <PodiumCard rank={2} player={players[1]} height="h-[100px] md:h-[120px]" avatarSize="w-12 h-12 md:w-14 md:h-14" />}
            {players[0] && <PodiumCard rank={1} player={players[0]} height="h-[130px] md:h-[160px]" avatarSize="w-14 h-14 md:w-16 md:h-16" crown />}
            {players[2] && <PodiumCard rank={3} player={players[2]} height="h-[80px] md:h-[100px]" avatarSize="w-11 h-11 md:w-13 md:h-13" />}
          </div>

          {/* Player rows (#4+) */}
          {players.slice(3).map((p, i) => (
            <div key={p.player_id || i} className="flex items-center gap-3 px-3.5 md:px-0 py-2.5 border-b border-[#F0EDE8] dark:border-[rgba(255,255,255,0.04)]">
              <span className="w-6 text-[11px] font-semibold text-[#888780] dark:text-[rgba(255,255,255,0.35)] tabular-nums text-right">{i + 4}</span>
              <div className="w-9 h-9 rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)] flex items-center justify-center">
                <span className="text-[10px] font-semibold text-[#D4537E]">{(p.username || 'P').charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary truncate">{p.username}</p>
                <p className="text-[9px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] capitalize">Lv.{p.level}</p>
              </div>
              <span className="text-xs font-semibold text-primary tabular-nums">{(p.total_points || 0).toLocaleString()}</span>
            </div>
          ))}
        </>
      ) : (
        <div className="rounded-2xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] py-10 text-center">
          <p className="text-sm text-[#888780] dark:text-[rgba(255,255,255,0.35)]">No plays yet</p>
          <p className="text-[11px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-1">Be the first to set a score</p>
        </div>
      )}

      <TipBanner tips={['Climb the leaderboard by earning XP', 'Daily challenges give +30% bonus XP']} />
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 mt-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 md:px-0 py-2.5">
          <div className="w-6 h-4 bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
          <div className="w-9 h-9 bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="w-28 h-3 bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] rounded animate-pulse mb-1.5" />
            <div className="w-12 h-2.5 bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
          </div>
          <div className="w-16 h-4 bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
