'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { VsBadge } from '@/components/duel/vs-badge';

import type { GameOfTheDayData } from '@/lib/db/queries/game-of-the-day';

/** Same midnight-UTC countdown as the Quiz of the day, so both pills agree. */
function useResetCountdown(): string {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    function calc(): void {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, []);
  return timeLeft;
}

const LABEL_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" />
  </svg>
);

export function GameOfTheDay({ data }: { data: GameOfTheDayData | null }): React.ReactElement | null {
  const timeLeft = useResetCountdown();
  if (!data) return null;

  return (
    <div className="daily-col">
      <p className="sec-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {LABEL_ICON}
        Game of the day
      </p>

      <div className="daily-card gotd-card">
        {timeLeft && <span className="daily-reset gotd-reset">Resets in {timeLeft}</span>}

        {data.kind === 'duel' ? (
          <>
            <Link
              href={`/games/this-or-that?group=${encodeURIComponent(data.group)}&type=${encodeURIComponent(data.type)}`}
              className="gotd-duel"
            >
              <span className="gotd-faces">
                <span className="gotd-face-wrap">
                  {data.a.image ? <img className="gotd-face" src={data.a.image} alt="" loading="lazy" /> : <span className="gotd-face" />}
                  <span className="gotd-face-name">{data.a.name}</span>
                </span>
                <VsBadge />
                <span className="gotd-face-wrap">
                  {data.b.image ? <img className="gotd-face" src={data.b.image} alt="" loading="lazy" /> : <span className="gotd-face" />}
                  <span className="gotd-face-name">{data.b.name}</span>
                </span>
              </span>
              <span className="gotd-prompt">{data.prompt}</span>
              <span className="gotd-cta">Vote in today&apos;s matchup</span>
            </Link>
            <Link href={`/rankings/${data.group}/${data.type}`} className="gotd-rank-link">
              See where fans rank them &rarr;
            </Link>
          </>
        ) : (
          <Link href={`/games/name-all/${data.slug}`} className="gotd-nam">
            <span className="gotd-nam-logo">
              <GroupLogo
                groupName={data.groupName ?? 'Group'}
                logoUrl={data.logoUrl}
                displayColor={data.displayColor ?? '#E8457A'}
                textColor={data.textColor ?? '#ffffff'}
                size={72}
              />
            </span>
            <span className="gotd-nam-title">
              Name all {data.memberCount} {data.groupName} members
            </span>
            <span className="gotd-nam-sub">Beat the clock: {data.timeLabel}</span>
            <span className="gotd-cta">Play today&apos;s challenge</span>
          </Link>
        )}
      </div>
    </div>
  );
}
