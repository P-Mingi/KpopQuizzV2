'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { hasPlayedDaily } from '@/lib/daily-played';
import { analytics } from '@/lib/analytics';

import type { QuizCardData } from '@/lib/db/types';

// F1.3 - Daily ritual cards, community edition. Two SLIM strips (2-up, stacking
// on narrow) rather than the home's full banner cards: HomeQotd has no cheap
// compact prop, so per spec this is the slim form. Client island only because
// of the reset countdown and the localStorage "played today" state, exactly the
// home pattern. The data itself is baked at ISR and passed in as props.
//
// Workstream N: the second strip is now the Blindtest of the Day (mirroring the
// home's premium pair). The blindtest strip needs no server data - the 10
// questions load when the user taps through - so it is purely client-side.

function useResetCountdown(): string {
  const [t, setT] = useState('');
  useEffect(() => {
    const calc = (): void => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setT(`${h}h ${m}m`);
    };
    calc();
    const iv = window.setInterval(calc, 60_000);
    return () => window.clearInterval(iv);
  }, []);
  return t;
}

interface Props {
  quiz: QuizCardData | null;
}

export function DailyRitual({ quiz }: Props): React.ReactElement | null {
  const countdown = useResetCountdown();
  const [quizPlayed, setQuizPlayed] = useState(false);
  const [blindtestPlayed, setBlindtestPlayed] = useState(false);
  useEffect(() => {
    setQuizPlayed(hasPlayedDaily('quiz'));
    setBlindtestPlayed(hasPlayedDaily('blindtest'));
  }, []);

  return (
    <div className="dr-grid">
      <style>{CSS}</style>

      {quiz && (
        <Strip
          icon="bolt"
          eyebrow="Quiz of the day"
          title={quiz.title}
          countdown={countdown}
          href={`/q/${quiz.slug}?daily=quiz`}
          played={quizPlayed}
          cta="Play"
          onPlay={() => analytics.crossPromo('community', 'quiz')}
        />
      )}

      <Strip
        icon="music"
        eyebrow="Blindtest of the day"
        title="Name that K-pop song"
        countdown={countdown}
        href="/blindtest?daily=true"
        played={blindtestPlayed}
        cta="Play"
        onPlay={() => analytics.crossPromo('community', 'blindtest')}
      />
    </div>
  );
}

function Strip({
  icon, eyebrow, title, countdown, href, played, cta, onPlay,
}: {
  icon: 'bolt' | 'music';
  eyebrow: string;
  title: string;
  countdown: string;
  href: string;
  played: boolean;
  cta: string;
  onPlay: () => void;
}): React.ReactElement {
  return (
    <div className="dr-strip">
      <div className="dr-head">
        <span className="dr-eyebrow">
          {icon === 'bolt' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--brand)" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          )}
          {eyebrow}
        </span>
        {countdown && <span className="dr-reset">{countdown}</span>}
      </div>

      <Link href={href} className="dr-title" onClick={onPlay}>{title}</Link>

      {played ? (
        <span className="dr-done">Played today</span>
      ) : (
        <Link href={href} className="dr-cta" onClick={onPlay}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          {cta}
        </Link>
      )}
    </div>
  );
}

const CSS = `
.dr-grid{ display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:12px; }
/* 2-up at the 430px mobile reference (spec: "beside it"), stacks below 400. */
@media (min-width:400px){ .dr-grid{ grid-template-columns:1fr 1fr; } }
.dr-strip{
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  box-shadow:var(--shadow-card); padding:12px; display:flex; flex-direction:column; gap:7px; min-width:0;
}
.dr-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dr-eyebrow{
  display:inline-flex; align-items:center; gap:5px;
  font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.09em; color:var(--txt3);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.dr-reset{ font-size:10.5px; color:var(--txt3); flex-shrink:0; font-variant-numeric:tabular-nums; }
.dr-title{
  font-size:14px; font-weight:700; color:var(--txt1); text-decoration:none; line-height:1.3;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.dr-title:hover{ color:var(--brand); }
.dr-cta{
  align-self:flex-start; display:inline-flex; align-items:center; gap:6px;
  min-height:34px; padding:0 16px; border-radius:9px; margin-top:auto;
  background:var(--brand-btn); color:#fff; font-size:12.5px; font-weight:700; text-decoration:none;
  transition:background .16s ease;
}
.dr-cta:hover{ background:var(--brand-btn-hover); }
.dr-done{
  align-self:flex-start; margin-top:auto; font-size:11.5px; font-weight:600; color:var(--txt3);
  padding:6px 0;
}
`;
