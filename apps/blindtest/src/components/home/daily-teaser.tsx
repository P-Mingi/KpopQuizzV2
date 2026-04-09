'use client';

import Link from 'next/link';
import { useDailyStatus } from '@/hooks/use-daily-status';

/**
 * Context-aware daily teaser card on the home page.
 * Pre-fetch state: neutral "Daily challenge" CTA (matches the server-rendered
 * page so there's no layout shift).
 * Post-fetch: either "haven't played yet" urgency or "you scored N/10, rank #X".
 */
export function DailyTeaser() {
  const status = useDailyStatus();

  const hasPlayed = status?.hasPlayed ?? false;
  const dayNumber = status?.dayNumber ?? null;
  const playCount = status?.playCount ?? 0;
  const playerResult = status?.playerResult ?? null;

  let label: React.ReactNode;
  let dotColor = 'bg-accent';
  let cta = 'Play';

  if (hasPlayed && playerResult) {
    dotColor = 'bg-correct';
    cta = 'View';
    label = (
      <>
        <span className="font-semibold text-primary">
          Daily{dayNumber ? ` #${dayNumber}` : ''}
        </span>
        <span className="text-ghost">
          {' - '}You scored {playerResult.correct}/10
          {playerResult.rank > 0 && <> (#{playerResult.rank} of {playerResult.total_players})</>}
        </span>
      </>
    );
  } else if (status) {
    label = (
      <>
        <span className="font-semibold text-primary">
          Daily challenge{dayNumber ? ` #${dayNumber}` : ''}
        </span>
        <span className="text-ghost">
          {playCount > 0 ? (
            <> - {playCount.toLocaleString()} played today, you haven&apos;t yet</>
          ) : (
            <> - Same 10 songs for everyone</>
          )}
        </span>
      </>
    );
  } else {
    // First render / loading state.
    label = (
      <>
        <span className="font-semibold text-primary">Daily challenge</span>
        <span className="text-ghost"> - Same 10 songs for everyone</span>
      </>
    );
  }

  return (
    <Link
      href="/daily"
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface border border-default shadow-card hover:border-accent transition-colors"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} aria-hidden="true" />
      <span className="flex-1 text-xs text-tertiary min-w-0 truncate">{label}</span>
      <span className="text-[11px] font-semibold text-accent flex-shrink-0">{cta}</span>
    </Link>
  );
}
