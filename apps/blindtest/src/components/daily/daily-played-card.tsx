'use client';

import { useState } from 'react';
import { buildEmojiGrid, generateShareText } from '@/lib/share';
import { CountdownTimer } from './countdown-timer';

interface SongResult {
  correct: boolean;
  answered: string | null;
}

interface Props {
  correct: number;
  score: number;
  totalTime: number;
  bestCombo: number;
  rank: number;
  totalPlayers: number;
  songs: SongResult[];
  dayNumber?: number;
  playlist: string;
  resetMs: number;
}

/**
 * Hero card shown on the daily page once the player has completed today's
 * daily challenge. Shows the emoji grid + rank + share button + countdown
 * to the next daily. Lives inside the gradient hero card on the page.
 */
export function DailyPlayedCard({
  correct,
  score,
  totalTime,
  rank,
  totalPlayers,
  songs,
  dayNumber,
  playlist,
  resetMs,
}: Props) {
  const [shareLabel, setShareLabel] = useState<'Share result' | 'Copied!' | 'Sharing...'>('Share result');

  const grid = buildEmojiGrid(songs);
  const isPerfect = correct === songs.length && songs.length > 0;

  async function handleShare() {
    const text = generateShareText({
      results: songs,
      totalScore: score,
      totalTime,
      streak: 0, // streak belongs to the overall player state, not this card
      mode: 'daily',
      playlist,
      ...(dayNumber !== undefined ? { dailyNumber: dayNumber } : {}),
    });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setShareLabel('Sharing...');
      try {
        await navigator.share({ text });
        setShareLabel('Share result');
        return;
      } catch {
        // cancelled; fall through
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareLabel('Copied!');
      setTimeout(() => setShareLabel('Share result'), 2000);
    } catch {
      setShareLabel('Share result');
    }
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold text-primary leading-tight">
        {isPerfect ? 'Perfect!' : 'Completed!'}
      </h1>
      <p className="text-[13px] text-daily mt-1">
        {correct}/{songs.length} - {score.toLocaleString()} pts
        {totalPlayers > 0 && rank > 0 && <> - Rank #{rank} of {totalPlayers}</>}
      </p>

      {/* Emoji grid */}
      <p
        className="text-[22px] mt-4 tracking-[2px] leading-none"
        style={{ fontFamily: 'var(--font-emoji, system-ui)', whiteSpace: 'nowrap', overflowX: 'auto' }}
      >
        {grid}
      </p>

      {/* Share + countdown */}
      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleShare}
          className="inline-block px-6 py-3 rounded-[12px] bg-accent text-primary text-sm font-bold active:scale-[0.98] transition-transform"
          aria-live="polite"
        >
          {shareLabel}
        </button>
        <p className="text-[11px] text-ghost">
          <CountdownTimer msUntilReset={resetMs} prefix="Next in " showSeconds={false} />
        </p>
      </div>
    </div>
  );
}
