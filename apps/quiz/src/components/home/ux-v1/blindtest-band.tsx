'use client';

import { useEffect, useState } from 'react';

import { UxButton, UxLink } from '@/components/ux-v1/button';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { countdownLabel, fansLabel, hoursLeftLabel, minutesToUtcMidnight, utcDay } from '@/lib/ux-v1/p1/format';

import { useNowMs, useStoredValue } from './use-client-values';

interface BandMe {
  signedIn: boolean;
  date: string;
  today: { score: number; rank: number; of: number } | null;
  best: number | null;
}

interface Props {
  /** Fans who played today's blindtest (daily_blindtest_scores), read at render. */
  fans: number;
  /** UTC day of that read: after the rollover the count is dropped, never shown as today's. */
  date: string;
}

const EQ_DELAYS = ['0s', '-.2s', '-.4s', '-.1s', '-.3s', '-.5s', '-.15s'];

/**
 * Blindtest of the day band (16.7, 17.5 day mode: the pink-lilac gradient). Server
 * render = the unplayed state (real copy, real count). On the client: the time
 * left to the UTC rollover, and the played state: a signed-in fan's score and rank
 * from /api/ux-v1/p1/daily-band ("You scored 8/10 today", See today's board, "Your
 * best 8/10"), a guest's "played today" flag from this browser (same flag as the
 * legacy daily card). Links: /blindtest?daily=true, /blindtest/leaderboard, /blindtest.
 */
export function BlindtestBand({ fans, date }: Props): React.ReactElement {
  const me = useUxMe();
  const signedIn = !!me?.profile;
  const ms = useNowMs();
  const now = ms === null ? null : new Date(ms);
  const mins = now ? minutesToUtcMidnight(now) : null;
  const today = now ? utcDay(now) : null;
  // The daily game's own "played today" flag (lib/daily-played.ts), per browser.
  const playedFlag = useStoredValue('kq_daily_blindtest_played');
  const guestPlayed = today !== null && playedFlag === today;
  const [mine, setMine] = useState<BandMe | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch('/api/ux-v1/p1/daily-band', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<BandMe>) : null))
      .then((d) => { if (!cancelled && d) setMine(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [signedIn]);

  const scored = signedIn && mine?.today ? mine.today : null;
  // This browser's "played today" flag (set by the daily game for everyone) until
  // the signed-in score arrives.
  const played = !!scored || guestPlayed;
  const left = mins != null ? countdownLabel(mins) : null;
  const fansToday = fans > 0 && (today === null || today === date) ? `${fansLabel(fans)} played today. ` : '';

  const kick = played ? 'Blindtest of the day · played' : `Blindtest of the day${mins != null ? ` · ${hoursLeftLabel(mins)}` : ''}`;
  const title = scored ? `You scored ${scored.score}/10 today.` : played ? "You played today's blindtest." : 'Ten songs. Same for everyone. One shot.';
  const body = scored
    ? `You are #${scored.rank} of ${fansLabel(Math.max(scored.of, scored.rank))} on today's board.${left ? ` A new daily starts in ${left}.` : ''}`
    : played
      ? (left ? `A new daily starts in ${left}.` : 'A new daily starts at midnight UTC.')
      : `${fansToday}Guess the song or the artist from a ten-second clip, then see where you rank.`;
  const best = signedIn && mine?.best != null ? mine.best : null;

  return (
    <section className="ux-sec ux-sec-lg" aria-labelledby="p1-band-h">
      <div className="p1-band">
        <div>
          <p className="p1-kick"><span className="p1-pulse" aria-hidden="true" />{kick}</p>
          <h2 id="p1-band-h">{title}</h2>
          <p className="p1-band-p">{body}</p>
          <div className="p1-actions">
            {played
              ? <UxButton href="/blindtest/leaderboard" size="lg" icon="trophy">See today&apos;s board</UxButton>
              : <UxButton href="/blindtest?daily=true" size="lg" icon="play">Play the daily</UxButton>}
            <UxLink href="/blindtest" icon="arrow">All blindtest modes</UxLink>
          </div>
        </div>
        <div className="p1-eqwrap">
          <div className="p1-eqv" aria-hidden="true">
            {EQ_DELAYS.map((d) => <i key={d} style={{ animationDelay: d }} />)}
          </div>
          {best != null ? <p className="p1-stat">Your best <b className="ux-num">{best}/10</b></p> : null}
        </div>
      </div>
    </section>
  );
}
