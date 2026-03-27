'use client';

import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { formatCount } from '@/lib/utils';

import type { GameCardData, Matchup } from '@/lib/db/types';

interface GameCardProps {
  game: GameCardData;
}

function findMostSkewed(matchups: Matchup[]): (Matchup & { pctA: number; pctB: number; total: number }) | null {
  let best: (Matchup & { pctA: number; pctB: number; total: number; skew: number }) | null = null;
  for (const m of matchups) {
    const total = m.votes_a + m.votes_b;
    if (total === 0) continue;
    const skew = Math.abs(m.votes_a - m.votes_b) / total;
    if (!best || skew > best.skew) {
      best = { ...m, pctA: Math.round((m.votes_a / total) * 100), pctB: 0, total, skew };
      best.pctB = 100 - best.pctA;
    }
  }
  return best;
}

export function GameCard({ game }: GameCardProps): React.ReactElement {
  const matchups = game.content?.matchups ?? [];
  const mostSkewed = game.play_count >= 10 ? findMostSkewed(matchups) : null;

  return (
    <Link href={`/g/${game.slug}`} className="block">
      <div className="bg-surface-primary border border-border-light rounded-2xl p-4 hover:border-border-medium transition-colors">
        {/* Badges */}
        <div className="flex gap-1.5 mb-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">
            This or That
          </span>
          {game.group_name && game.display_color && game.text_color && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: game.display_color, color: game.text_color }}
            >
              {game.group_name}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium mb-3 text-txt-primary">{game.title}</p>

        {/* Preview bar -- most one-sided matchup */}
        {mostSkewed && (
          <div className="bg-surface-secondary rounded-lg p-2.5 mb-3">
            <div className="flex justify-between text-[11px] font-medium mb-1.5 text-txt-primary">
              <span>{mostSkewed.option_a}</span>
              <span>{mostSkewed.option_b}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
              <div style={{ width: `${mostSkewed.pctA}%` }} className="bg-[#ED93B1] rounded-l-full" />
              <div style={{ width: `${mostSkewed.pctB}%` }} className="bg-[#B5D4F4] rounded-r-full" />
            </div>
            <p className="text-[10px] text-txt-tertiary text-center mt-1">Most one-sided matchup</p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserAvatar
              username={game.creator_username}
              avatarUrl={game.creator_avatar_url}
              bgColor={game.creator_avatar_bg}
              textColor={game.creator_avatar_text}
              size={16}
            />
            <span className="text-xs text-txt-secondary">by {game.creator_username}</span>
          </div>
          <span className="text-xs text-txt-secondary">
            {formatCount(game.play_count)} plays &middot; {game.matchup_count} matchups
          </span>
        </div>
      </div>
    </Link>
  );
}
