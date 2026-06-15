'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { GroupLogo } from '@/components/ui/group-logo';
import { Mascot } from '@/components/ui/mascot';
import { hasPlayedDaily } from '@/lib/daily-played';
import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
}

/** §2b + §10e - Quiz of the day, above the fold. No play count; reset countdown
 *  pill in the banner; pulsing "Play today's quiz" CTA. */
export function HomeQotd({ quiz }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  // F6: post-hydration so SSR + first client render match (no hydration mismatch).
  const [played, setPlayed] = useState(false);
  // L4: signed-in user's per-account daily streak (small, optional surface).
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    setPlayed(hasPlayedDaily('quiz'));
    fetch('/api/daily/streak').then((r) => r.json()).then((d: { streak?: number }) => setStreak(d.streak ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    function calc() {
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--brand)" aria-hidden="true">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
        Quiz of the day
      </p>

      <div className="daily-card">
        <div
          className="daily-banner"
          style={{ background: `linear-gradient(135deg, ${quiz.display_color}, color-mix(in srgb, ${quiz.display_color} 55%, var(--brand)))` }}
        >
          {timeLeft && <span className="daily-reset">Resets in {timeLeft}</span>}
          <div style={{ position: 'absolute', bottom: -20, right: 14, width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--surface)', boxShadow: '0 3px 10px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
            <div style={{ transform: 'scale(1.42)' }}>
              <GroupLogo groupName={quiz.group_name} logoUrl={quiz.logo_url} displayColor={quiz.display_color} textColor={quiz.text_color} size={64} />
            </div>
          </div>
        </div>

        <div className="daily-body">
          <div className="badge-row" style={{ marginBottom: 8 }}>
            <QuizTypeBadge type={quiz.quiz_type} size="sm" />
            <DifficultyBadge difficulty={quiz.difficulty} />
            {streak > 1 && (
              <span className="streak-chip" aria-label={`${streak} day streak`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-.7-2.5-1.5-3.5C14.8 9 16 7 16 5c0-1.5-1-3-4-3zm-2 11a2 2 0 1 0 4 0c0-.8-.4-1.4-1-2-1.2 1.3-3 1.5-3 2z"/></svg>
                Day {streak} streak
              </span>
            )}
          </div>
          <Link href={`/q/${quiz.slug}?daily=quiz`} className="daily-title" style={{ display: 'block', textDecoration: 'none' }}>
            {quiz.title}
          </Link>
          <p className="daily-author">by {quiz.creator_username}</p>
          {played ? (
            <div className="daily-done">
              <Mascot variant="sleep" size={48} alt="" />
              <span className="daily-done-text">Played today &middot; come back tomorrow</span>
            </div>
          ) : (
            <Link href={`/q/${quiz.slug}?daily=quiz`} className="daily-cta" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Play today&apos;s quiz
            </Link>
          )}
          <span className="gotd-rank-spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
