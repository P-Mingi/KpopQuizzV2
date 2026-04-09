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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <TabButton label="This week" active={tab === 'weekly'} onClick={() => setTab('weekly')} />
        <TabButton label="All time" active={tab === 'alltime'} onClick={() => setTab('alltime')} />
        <TabButton label="Top players" active={tab === 'players'} onClick={() => setTab('players')} />
      </div>

      {/* Rows */}
      {tab === 'weekly' && <CreatorList creators={weekly} statKey="weekly_plays" statLabel="plays" />}
      {tab === 'alltime' && <CreatorList creators={allTime} statKey="total_plays_received" statLabel="total plays" />}
      {tab === 'players' && <PlayerList players={topPlayers} />}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
        active
          ? 'bg-accent-bg text-accent border-accent'
          : 'bg-surface text-ghost border-default hover:text-tertiary'
      }`}
    >
      {label}
    </button>
  );
}

function rankColor(rank: number): string {
  if (rank === 0) return 'text-combo';
  if (rank === 1) return 'text-secondary';
  if (rank === 2) return 'text-[#D85A30]';
  return 'text-tertiary';
}

interface CreatorListProps<T> {
  creators: T[];
  statKey: keyof T;
  statLabel: string;
}

function CreatorList<T extends { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string; total_quizzes_created: number }>({
  creators,
  statKey,
  statLabel,
}: CreatorListProps<T>): React.ReactElement {
  if (creators.length === 0) {
    return <EmptyState message="No creators yet." />;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {creators.map((c, i) => (
        <li key={c.username}>
          <Link
            href={`/u/${c.username}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-default hover:border-accent transition-colors"
          >
            <span className={`text-[15px] font-bold tabular-nums w-6 text-center ${rankColor(i)}`}>
              {i + 1}
            </span>
            <UserAvatar
              username={c.username}
              avatarUrl={c.avatar_url}
              bgColor={c.avatar_bg}
              textColor={c.avatar_text}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-primary truncate">{c.username}</p>
              <p className="text-[10px] text-ghost">{c.total_quizzes_created} quizzes</p>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-bold text-primary tabular-nums">
                {formatCount(c[statKey] as unknown as number)}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-ghost">{statLabel}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PlayerList({ players }: { players: TopPlayer[] }): React.ReactElement {
  if (players.length === 0) {
    return <EmptyState message="No players yet." />;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {players.map((p, i) => {
        const lvl = getLevelInfo(p.xp);
        const title = getTitleForLevel(lvl.level);
        return (
          <li key={p.username}>
            <Link
              href={`/u/${p.username}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-default hover:border-accent transition-colors"
            >
              <span className={`text-[15px] font-bold tabular-nums w-6 text-center ${rankColor(i)}`}>
                {i + 1}
              </span>
              <UserAvatar
                username={p.username}
                avatarUrl={p.avatar_url}
                bgColor={p.avatar_bg}
                textColor={p.avatar_text}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-primary truncate">{p.username}</p>
                <p className="text-[10px] text-accent font-semibold">
                  Lv.{lvl.level} &middot; {title.en}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-primary tabular-nums">{formatCount(p.xp)}</p>
                <p className="text-[9px] uppercase tracking-wider text-ghost">XP</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="text-center py-8 bg-surface border border-default rounded-xl">
      <p className="text-sm text-tertiary">{message}</p>
    </div>
  );
}
