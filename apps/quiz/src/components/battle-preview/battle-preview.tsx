'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { VsBadge } from '@/components/duel/vs-badge';

// ============================================================
// Step E PROTOTYPE - async 1v1 battle UI (Type 1 quick match). MOCK ONLY:
// no API, no DB, no matchmaking. Lives at /battle-preview for sign-off. The
// opponent is an HONEST async "ghost" (a real fan who already played), never a
// fake live/online player. Built on B0 tokens, reuses the quiz play look + VS
// badge. Nothing here is wired - it exists to validate the UX.
// ============================================================

type Phase = 'entry' | 'playing' | 'reveal';

interface MockQuestion {
  q: string;
  options: [string, string, string, string];
  correct: number;
}

interface Ghost {
  handle: string;
  when: string;
  got: boolean[]; // per-question correctness (length 7)
}

const GROUPS = ['Any group', 'BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa'];

const QUESTIONS: MockQuestion[] = [
  { q: "Which group released 'Ditto'?", options: ['NewJeans', 'IVE', 'LE SSERAFIM', 'aespa'], correct: 0 },
  { q: "What is BLACKPINK's fandom called?", options: ['ARMY', 'BLINK', 'ONCE', 'STAY'], correct: 1 },
  { q: 'Who is the leader of Stray Kids?', options: ['Felix', 'Hyunjin', 'Bang Chan', 'Han'], correct: 2 },
  { q: "'Spring Day' is a song by which group?", options: ['EXO', 'BTS', 'SEVENTEEN', 'NCT'], correct: 1 },
  { q: 'Which company manages aespa?', options: ['HYBE', 'SM', 'JYP', 'YG'], correct: 1 },
  { q: 'TWICE debuted in which year?', options: ['2014', '2015', '2016', '2017'], correct: 1 },
  { q: "'God's Menu' is a title track by?", options: ['ATEEZ', 'Stray Kids', 'TXT', 'ENHYPEN'], correct: 1 },
];

const GHOSTS: Ghost[] = [
  { handle: '@luna_stay', when: '2 hours ago', got: [true, true, false, true, false, true, true] },
  { handle: '@hee_bias', when: 'yesterday', got: [true, false, true, true, true, false, true] },
  { handle: '@minji4ever', when: '18 minutes ago', got: [false, true, true, false, true, true, false] },
];

const QUESTION_TIME = 10; // seconds per question (prototype)
const LETTERS = ['A', 'B', 'C', 'D'];

export function BattlePreview(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('entry');
  const [group, setGroup] = useState('Any group');
  const [ghostIdx, setGhostIdx] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [toast, setToast] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghost = GHOSTS[ghostIdx]!;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  // --- per-question countdown ---
  useEffect(() => {
    if (phase !== 'playing' || locked) return;
    if (timeLeft <= 0) { lockAndAdvance(null); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, locked, timeLeft]);

  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  const startBattle = useCallback(() => {
    setQIndex(0);
    setAnswers([]);
    setLocked(false);
    setPicked(null);
    setTimeLeft(QUESTION_TIME);
    setPhase('playing');
  }, []);

  function lockAndAdvance(choice: number | null): void {
    if (locked) return;
    setLocked(true);
    setPicked(choice);
    setAnswers((a) => { const next = [...a]; next[qIndex] = choice; return next; });
    advanceRef.current = setTimeout(() => {
      if (qIndex >= QUESTIONS.length - 1) {
        setPhase('reveal');
      } else {
        setQIndex((i) => i + 1);
        setLocked(false);
        setPicked(null);
        setTimeLeft(QUESTION_TIME);
      }
    }, reduceMotion ? 350 : 850);
  }

  const newBattle = useCallback(() => {
    setGhostIdx((i) => (i + 1) % GHOSTS.length); // a FRESH ghost
    setQIndex(0);
    setAnswers([]);
    setLocked(false);
    setPicked(null);
    setTimeLeft(QUESTION_TIME);
    setPhase('playing');
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // --- scores ---
  const youCorrect = answers.filter((a, i) => a !== null && a === QUESTIONS[i]!.correct).length;
  const themCorrect = ghost.got.filter(Boolean).length;
  const diff = youCorrect - themCorrect;
  const verdict = diff > 0 ? `You won by ${diff}` : diff < 0 ? `Lost by ${-diff}` : 'Dead tie';
  const verdictKind = diff > 0 ? 'win' : diff < 0 ? 'loss' : 'tie';

  // ring geometry
  const R = 28;
  const C = 2 * Math.PI * R;
  const frac = timeLeft / QUESTION_TIME;

  return (
    <div className="bp-screen">
      <p className="bp-proto-flag">Battle preview &middot; mock flow for sign-off (nothing here is saved)</p>

      {/* ===================== ENTRY ===================== */}
      {phase === 'entry' && (
        <div className="bp-body">
          <span className="bp-eyebrow">1v1 Battle</span>
          <h1 className="bp-head">Quick match</h1>
          <p className="bp-sub">
            7 questions, head to head. We match your run against a real fan who already played, so you
            start instantly. No waiting for an opponent.
          </p>

          <div className="bp-field">
            <span className="bp-label">Pick a topic</span>
            <div className="bp-groups">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`bp-chip${group === g ? ' on' : ''}`}
                  aria-pressed={group === g}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="bp-start" onClick={startBattle}>
            Start battle
          </button>
          <p className="bp-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            You will be matched with someone&apos;s saved run, never a fake live player.
          </p>
        </div>
      )}

      {/* ===================== PLAYING ===================== */}
      {phase === 'playing' && (() => {
        const cur = QUESTIONS[qIndex]!;
        return (
          <div className="bp-body">
            <div className="bp-play-top">
              <span className="bp-qcount">Question {qIndex + 1} of {QUESTIONS.length}</span>
              <div className="bp-ring" role="timer" aria-label={`${timeLeft} seconds left`}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={R} className="bp-ring-track" />
                  <circle
                    cx="32" cy="32" r={R} className="bp-ring-prog"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - frac)}
                    style={{ transition: reduceMotion ? 'none' : 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="bp-ring-num">{timeLeft}</span>
              </div>
            </div>

            <div className="bp-progress" aria-hidden="true">
              {QUESTIONS.map((_, i) => (
                <span key={i} className={`bp-prog-dot${i === qIndex ? ' active' : i < qIndex ? ' done' : ''}`} />
              ))}
            </div>

            <p className="bp-question" key={qIndex}>{cur.q}</p>

            <div className="bp-answers">
              {cur.options.map((opt, i) => {
                let cls = 'ans-btn bp-ans';
                if (locked) {
                  if (i === cur.correct) cls += ' correct';
                  else if (i === picked) cls += ' wrong';
                  else cls += ' dimmed';
                }
                return (
                  <button key={i} type="button" className={cls} disabled={locked} onClick={() => lockAndAdvance(i)}>
                    <span className="bp-ans-letter" aria-hidden="true">{LETTERS[i]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===================== REVEAL (the heart) ===================== */}
      {phase === 'reveal' && (
        <div className="bp-body">
          <h1 className="bp-head bp-center">{verdict === 'Dead tie' ? 'So close' : verdict.startsWith('You won') ? 'You won!' : 'So close'}</h1>

          {/* You vs @stranger */}
          <div className="bp-vs-row">
            <div className="bp-side bp-you">
              <span className="bp-side-label">You</span>
              <span className="bp-side-score">{youCorrect}</span>
            </div>
            <VsBadge className="bp-vs" />
            <div className="bp-side bp-them">
              <span className="bp-side-label">{ghost.handle}</span>
              <span className="bp-side-score">{themCorrect}</span>
            </div>
          </div>

          <p className={`bp-verdict is-${verdictKind}`}>{verdict}</p>
          <p className="bp-async-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {ghost.handle} played {ghost.when}
          </p>

          {/* per-question head to head */}
          <div className="bp-h2h">
            <div className="bp-h2h-row">
              <span className="bp-h2h-name">You</span>
              {QUESTIONS.map((qq, i) => {
                const ok = answers[i] !== null && answers[i] === qq.correct;
                return <span key={i} className={`bp-h2h-cell ${ok ? 'hit' : 'miss'}`} aria-label={`Question ${i + 1}: ${ok ? 'correct' : 'missed'}`}>{ok ? CHECK : CROSS}</span>;
              })}
            </div>
            <div className="bp-h2h-row">
              <span className="bp-h2h-name">{ghost.handle}</span>
              {ghost.got.map((ok, i) => (
                <span key={i} className={`bp-h2h-cell ${ok ? 'hit' : 'miss'}`} aria-label={`Question ${i + 1}: ${ghost.handle} ${ok ? 'correct' : 'missed'}`}>{ok ? CHECK : CROSS}</span>
              ))}
            </div>
          </div>

          {/* TWO CTAs */}
          <div className="bp-cta-row">
            <button type="button" className="bp-start bp-cta-half" onClick={() => showToast('Link copied. Send it to a friend!')}>
              Challenge a friend
            </button>
            <button type="button" className="bp-ghost-btn bp-cta-half" onClick={newBattle}>
              New battle
            </button>
          </div>

          {/* POST-BATTLE FAN-PRIDE HOOK (Section 4) */}
          <AddQuestionHook />
        </div>
      )}

      {toast && <div className="bp-toast" role="status">{toast}</div>}
    </div>
  );
}

// --- the competitive fan-pride add-a-question hook (Section 4) ---
function AddQuestionHook(): React.ReactElement {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const ready = q.trim().length > 0 && opts.every((o) => o.trim().length > 0) && correct !== null;

  if (submitted) {
    return (
      <div className="bp-hook bp-hook-done" role="status">
        <span className="bp-hook-tick" aria-hidden="true">{CHECK}</span>
        <p className="bp-hook-done-title">Your question is in.</p>
        <p className="bp-hook-done-sub">Other fans are looking at it now, and you&apos;ll see it appear in battles soon.</p>
      </div>
    );
  }

  return (
    <div className="bp-hook">
      <p className="bp-hook-head">Beat your friends with a question only a real fan would know</p>
      <p className="bp-hook-sub">Drop one in. If other fans confirm it, it shows up in battles with your name on it.</p>

      <label className="bp-label" htmlFor="bp-q">Your question</label>
      <input id="bp-q" className="bp-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which B-side did LE SSERAFIM open their first tour with?" maxLength={140} />

      <span className="bp-label">Answers (tap the circle to mark the correct one)</span>
      <div className="bp-hook-answers">
        {opts.map((o, i) => (
          <div key={i} className={`bp-hook-answer${correct === i ? ' correct' : ''}`}>
            <button type="button" className="bp-radio" aria-label={`Mark answer ${i + 1} correct`} aria-pressed={correct === i} onClick={() => setCorrect(i)}>
              {correct === i && <span aria-hidden="true">{CHECK}</span>}
            </button>
            <input className="bp-input bp-input-sm" value={o} onChange={(e) => setOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Answer ${LETTERS[i]}`} maxLength={80} aria-label={`Answer ${LETTERS[i]}`} />
          </div>
        ))}
      </div>

      <button type="button" className="bp-start" disabled={!ready} onClick={() => setSubmitted(true)}>
        Add it to battles
      </button>
    </div>
  );
}

const CHECK = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const CROSS = (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
);
