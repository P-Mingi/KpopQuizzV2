'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { GameOfTheDayData } from '@/lib/db/queries/game-of-the-day';

// Slim one-line "Game of the day" strip for the /games picker. Derives the
// title + play link from the existing GOTD rotation data and shows a live
// countdown to the midnight-UTC reset (same boundary the home dailies use).

function secondsToMidnightUtc(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}

function fmtCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function resolve(data: GameOfTheDayData): { title: string; href: string } {
  switch (data.kind) {
    case 'duel':
      return {
        title: data.prompt,
        href: `/games/this-or-that?group=${encodeURIComponent(data.group)}&type=${encodeURIComponent(data.type)}&daily=game`,
      };
    case 'personality':
      return {
        title: `Which ${data.groupName} member are you?`,
        href: `/which-${data.slug}-member-are-you?daily=game`,
      };
    case 'sort-it':
      return { title: data.title, href: `/games/sort-it/${data.slug}?daily=game` };
    case 'match-up':
      return { title: data.title, href: `/games/match-up/${data.slug}?daily=game` };
    case 'name-them-all':
      return { title: data.title, href: `/games/name-them-all/${data.slug}?daily=game` };
    case 'name-all':
    default:
      return {
        title: `Name all ${data.groupName ?? ''} members`.replace(/\s+/g, ' ').trim(),
        href: `/games/name-all/${data.slug}?daily=game`,
      };
  }
}

export function GamesDailyStrip({ data }: { data: GameOfTheDayData | null }): React.ReactElement | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(secondsToMidnightUtc());
    const t = setInterval(() => setLeft(secondsToMidnightUtc()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!data) return null;
  const { title, href } = resolve(data);

  return (
    <Link href={href} className="gds">
      <span className="gds-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M5 8l-2-2M19 8l2-2" /><circle cx="12" cy="14" r="8" /><path d="M12 11v3l2 1" /></svg>
      </span>
      <span className="gds-text">
        <span className="gds-label">Game of the day</span>
        <span className="gds-title">{title}</span>
      </span>
      {left !== null && <span className="gds-countdown" aria-label={`Resets in ${fmtCountdown(left)}`}>{fmtCountdown(left)} left</span>}
      <span className="gds-play">Play &rarr;</span>
    </Link>
  );
}
