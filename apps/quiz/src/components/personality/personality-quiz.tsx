'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';

import { analytics } from '@/lib/analytics';
import { runQuiz, type PersonalityQuestion, type PersonalityProfile, type QuizResult } from '@/lib/personality/engine';

import type { PersonalityGroup } from '@/lib/personality/data';

interface Props {
  group: PersonalityGroup;
  questions: PersonalityQuestion[];
  profiles: PersonalityProfile[];
  /** Real per-member run counts for the last 30 days (member_name -> count). */
  monthlyCounts: Record<string, number>;
}

const COUNT_MIN = 20; // do not show "N fans got X" below this (honesty gate)

function memberPhoto(url: string | null): string | undefined {
  return url ? encodeURI(url) : undefined;
}

export function PersonalityQuiz({ group, questions, profiles, monthlyCounts }: Props): React.ReactElement {
  const [phase, setPhase] = useState<'intro' | 'q' | 'result'>('intro');
  const [qi, setQi] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);

  const accent = group.display_color || '#E8457A';
  const onAccent = group.text_color || '#FFFFFF';

  const result: QuizResult | null = useMemo(
    () => (picks.length === questions.length ? runQuiz(questions, picks, profiles) : null),
    [picks, questions, profiles],
  );

  const start = useCallback(() => {
    analytics.gameStart('personality', false);
    setPicks([]);
    setQi(0);
    setPhase('q');
  }, []);

  const answer = useCallback((idx: number) => {
    setPicks((prev) => {
      const next = [...prev];
      next[qi] = idx;
      if (qi + 1 >= questions.length) {
        analytics.gameComplete('personality', 0, questions.length, false);
        setPhase('result');
      } else {
        setQi(qi + 1);
      }
      return next;
    });
  }, [qi, questions.length]);

  const retake = useCallback(() => { setPicks([]); setQi(0); setShowAll(false); setPhase('intro'); }, []);

  // ---------- INTRO ----------
  if (phase === 'intro') {
    const faces = profiles.slice(0, 8);
    return (
      <div className="pq" style={{ ['--pq-accent' as string]: accent, ['--pq-on' as string]: onAccent }}>
        <div className="pq-intro">
          <p className="pq-eyebrow">Personality quiz</p>
          <h1 className="pq-title">Which {group.name} member are you?</h1>
          <p className="pq-sub">10 questions, 1 result. Answer honestly, trust your first click.</p>
          <div className="pq-faces" aria-hidden="true">
            {faces.map((m) => (
              <span key={m.member_slug} className="pq-face">
                {m.photo_url
                  ? <img src={memberPhoto(m.photo_url)} alt="" loading="lazy" />
                  : <span className="pq-face-empty" style={{ background: accent }} />}
              </span>
            ))}
          </div>
          <button type="button" className="pq-start" onClick={start}>Start the quiz</button>
          <Link href={`/${group.slug}`} className="pq-ghost">Or take a {group.name} knowledge quiz</Link>
        </div>
      </div>
    );
  }

  // ---------- QUESTIONS ----------
  if (phase === 'q') {
    const q = questions[qi]!;
    return (
      <div className="pq" style={{ ['--pq-accent' as string]: accent, ['--pq-on' as string]: onAccent }}>
        <div className="pq-qwrap">
          <div className="pq-progress-row">
            <div className="pq-progress"><div className="pq-progress-fill" style={{ width: `${(qi / questions.length) * 100}%` }} /></div>
            <span className="pq-count">{qi + 1}/{questions.length}</span>
          </div>
          <h2 className="pq-q" key={qi}>{q.question}</h2>
          <div className="pq-options">
            {q.options.map((o, i) => (
              <button key={i} type="button" className="pq-option" onClick={() => answer(i)}>
                {o.text}
              </button>
            ))}
          </div>
          {qi > 0 && <button type="button" className="pq-back" onClick={() => setQi(qi - 1)}>&larr; Back</button>}
        </div>
      </div>
    );
  }

  // ---------- RESULT ----------
  if (!result) return <div className="pq" />;
  const top = result.top;
  const m = top.profile;
  const count = monthlyCounts[m.member_name] ?? 0;
  const ranked = result.ranked;
  const shown = showAll ? ranked : ranked.slice(0, 5);

  return (
    <div className="pq" style={{ ['--pq-accent' as string]: accent, ['--pq-on' as string]: onAccent }}>
      <div className="pq-result">
        <div className="pq-card">
          <div className="pq-card-photo">
            {m.photo_url
              ? <img src={memberPhoto(m.photo_url)} alt={m.member_name} />
              : <span className="pq-face-empty" style={{ background: accent, width: '100%', height: '100%' }} />}
            <span className="pq-card-badge">{top.matchPct}% match</span>
          </div>
          <div className="pq-card-body">
            <p className="pq-card-kicker">You got</p>
            <p className="pq-card-name">{m.member_name}</p>
            <ul className="pq-traits">
              {m.trait_lines.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
            {count >= COUNT_MIN && (
              <p className="pq-card-count">{count.toLocaleString('en-US')} fans got {m.member_name} this month</p>
            )}
          </div>
        </div>

        <div className="pq-breakdown">
          <p className="pq-breakdown-h">Your full match breakdown</p>
          <ul className="pq-breakdown-list">
            {shown.map((row, i) => (
              <li key={row.profile.member_slug} className={`pq-breakdown-row${i === 0 ? ' top' : ''}`}>
                <span className="pq-breakdown-rank">{i + 1}</span>
                <span className="pq-breakdown-name">{row.profile.member_name}</span>
                <span className="pq-breakdown-bar"><span className="pq-breakdown-fill" style={{ width: `${row.matchPct}%` }} /></span>
                <span className="pq-breakdown-pct">{row.matchPct}%</span>
              </li>
            ))}
          </ul>
          {ranked.length > 5 && (
            <button type="button" className="pq-seeall" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show top 5' : `See all ${ranked.length}`}
            </button>
          )}
        </div>

        <div className="pq-cta">
          <button type="button" className="pq-start" onClick={retake}>Retake</button>
          <Link href={`/${group.slug}`} className="pq-ghost">Try a {group.name} knowledge quiz</Link>
        </div>
      </div>
    </div>
  );
}
