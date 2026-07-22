'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { hasPlayedDaily } from '@/lib/daily-played';

// N3 - Blindtest of the Day home card. Mirrors HomeQotd/GameOfTheDay's
// daily-col + daily-card structure. The banner is a photo header tinted with the
// --blind/--brand accent. Pure client island: it only reads localStorage for the
// "played today" state; the actual 10 questions load when the user taps Play.

export function HomeBtotd(): React.ReactElement {
  const [timeLeft, setTimeLeft] = useState('');
  const [played, setPlayed] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setPlayed(hasPlayedDaily('blindtest'));
    fetch('/api/daily/streak').then((r) => r.json()).then((d: { streak?: number }) => setStreak(d.streak ?? 0)).catch(() => {});
  }, []);

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

  return (
    <div className="daily-col">
      <p className="sec-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blind)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        Blindtest of the day
      </p>

      <div className="daily-card">
        <div
          className="daily-banner"
          style={{
            backgroundImage: 'linear-gradient(120deg, color-mix(in srgb, var(--blind) 48%, transparent), color-mix(in srgb, var(--brand) 32%, transparent)), url(/blindtest-header.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
          }}
        >
          {timeLeft && <span className="daily-reset">Resets in {timeLeft}</span>}
        </div>

        <div className="daily-body">
          {streak > 1 && (
            <div className="badge-row" style={{ marginBottom: 8 }}>
              <span className="streak-chip" aria-label={`${streak} day streak`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-.7-2.5-1.5-3.5C14.8 9 16 7 16 5c0-1.5-1-3-4-3zm-2 11a2 2 0 1 0 4 0c0-.8-.4-1.4-1-2-1.2 1.3-3 1.5-3 2z" /></svg>
                Day {streak} streak
              </span>
            </div>
          )}
          <Link href="/blindtest?daily=true" className="daily-title" style={{ display: 'block', textDecoration: 'none' }}>
            Name that K-pop song
          </Link>
          <p className="daily-author">10 songs, same for everyone</p>
          {played ? (
            <div className="daily-done">
              <Mascot variant="sleep" size={48} alt="" />
              <span className="daily-done-text">Played today &middot; come back tomorrow</span>
            </div>
          ) : (
            <Link href="/blindtest?daily=true" className="daily-cta" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Play today&apos;s blindtest
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
