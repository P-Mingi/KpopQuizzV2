'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { VsBadge } from '@/components/duel/vs-badge';
import { Mascot } from '@/components/ui/mascot';
import { LevelUpOverlay } from '@/components/quiz/level-up-overlay';
import { getTitleForLevel } from '@/lib/level-titles';

// E4 - the real async 1v1 quick-match battle (Type 1), wired to the E2/E3 APIs.
// Reuses the validated /battle-preview UI (.bp-* styles). Honest async ghost,
// never a fake live opponent. Battle XP for signed-in players (win +25/loss +5)
// with the L2 level-up overlay.

interface PickerGroup { slug: string; name: string }
interface BattleQ { question: string; options: string[]; correct: number; fun_fact: string | null }
interface Ghost { score: number; per_question: boolean[]; handle: string; played_ago: string | null; cold: boolean }

type Phase = 'entry' | 'loading' | 'playing' | 'reveal';

const QUESTION_TIME = 10;
const LETTERS = ['A', 'B', 'C', 'D'];
const CHECK = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const CROSS = <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;

export function BattleGame({ groups, signedIn }: { groups: PickerGroup[]; signedIn: boolean }): React.ReactElement {
  const TOPICS: PickerGroup[] = [{ slug: '', name: 'Any group' }, ...groups];

  const [phase, setPhase] = useState<Phase>('entry');
  const [topic, setTopic] = useState('');
  const [battleId, setBattleId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<BattleQ[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [levelUpDismissed, setLevelUpDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const startedAt = useRef(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  const showToast = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2200); }, []);

  const startBattle = useCallback(async () => {
    setPhase('loading');
    // "Any group" -> a random real group so the start API always has a target.
    let groupSlug = topic;
    if (!groupSlug && groups.length > 0) groupSlug = groups[Math.floor(Math.random() * groups.length)]!.slug;
    try {
      const res = await fetch('/api/battle/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupSlug }),
      });
      const data = (await res.json()) as { battleId?: string; questions?: BattleQ[]; error?: string };
      if (!res.ok || !data.battleId || !data.questions?.length) {
        showToast(data.error ?? 'Could not start a battle. Try another topic.');
        setPhase('entry');
        return;
      }
      setBattleId(data.battleId);
      setQuestions(data.questions);
      setAnswers([]);
      setQIndex(0);
      setLocked(false);
      setPicked(null);
      setTimeLeft(QUESTION_TIME);
      setGhost(null);
      setXpEarned(0);
      setLevelUp(null);
      setLevelUpDismissed(false);
      finishingRef.current = false;
      startedAt.current = Date.now();
      setPhase('playing');
    } catch {
      showToast('Could not start a battle. Check your connection.');
      setPhase('entry');
    }
  }, [topic, groups, showToast]);

  const finishBattle = useCallback(async (finalAnswers: Array<number | null>) => {
    if (finishingRef.current || !battleId) return;
    finishingRef.current = true;
    const perQuestion = questions.map((q, i) => finalAnswers[i] != null && finalAnswers[i] === q.correct);
    const score = perQuestion.filter(Boolean).length;
    const timeMs = Date.now() - startedAt.current;
    try {
      await fetch(`/api/battle/${battleId}/result`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, per_question: perQuestion, time_ms: timeMs }),
      });
      const gRes = await fetch(`/api/battle/${battleId}/ghost?score=${score}`);
      const gData = (await gRes.json()) as { ghost: Ghost };
      setGhost(gData.ghost);
      if (signedIn) {
        const won = score > gData.ghost.score;
        const xRes = await fetch(`/api/battle/${battleId}/xp`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ won }),
        });
        const x = (await xRes.json()) as { xp_earned: number; leveled_up: boolean; new_level: number | null; new_level_name: string | null };
        setXpEarned(x.xp_earned ?? 0);
        if (x.leveled_up && x.new_level) setLevelUp({ level: x.new_level, title: x.new_level_name ?? getTitleForLevel(x.new_level).en });
      }
    } catch {
      // Even if scoring services hiccup, show the reveal with what we have.
    }
    setPhase('reveal');
  }, [battleId, questions, signedIn]);

  // per-question countdown
  useEffect(() => {
    if (phase !== 'playing' || locked) return;
    if (timeLeft <= 0) { lockAndAdvance(null); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, locked, timeLeft]);

  function lockAndAdvance(choice: number | null): void {
    if (locked) return;
    setLocked(true);
    setPicked(choice);
    const next = [...answers]; next[qIndex] = choice; setAnswers(next);
    advanceRef.current = setTimeout(() => {
      if (qIndex >= questions.length - 1) {
        void finishBattle(next);
      } else {
        setQIndex((i) => i + 1);
        setLocked(false);
        setPicked(null);
        setTimeLeft(QUESTION_TIME);
      }
    }, reduceMotion ? 350 : 800);
  }

  // ---- scores / verdict ----
  const youScore = answers.filter((a, i) => a != null && questions[i] && a === questions[i]!.correct).length;
  const themScore = ghost?.score ?? 0;
  const diff = youScore - themScore;
  const verdict = ghost?.cold
    ? (diff >= 0 ? 'You beat par!' : 'Below par')
    : (diff > 0 ? `You won by ${diff}` : diff < 0 ? `Lost by ${-diff}` : 'Dead tie');
  const verdictKind = diff > 0 ? 'win' : diff < 0 ? 'loss' : 'tie';

  const R = 28, C = 2 * Math.PI * R;

  return (
    <div className="bp-screen">
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
              {TOPICS.map((g) => (
                <button key={g.slug || 'any'} type="button" className={`bp-chip${topic === g.slug ? ' on' : ''}`} aria-pressed={topic === g.slug} onClick={() => setTopic(g.slug)}>{g.name}</button>
              ))}
            </div>
          </div>
          <button type="button" className="bp-start" onClick={() => void startBattle()}>Start battle</button>
          <p className="bp-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            You will be matched with someone&apos;s saved run, never a fake live player.
          </p>
        </div>
      )}

      {/* ===================== LOADING ===================== */}
      {phase === 'loading' && (
        <div className="bt-loading" role="status" aria-live="polite">
          <Mascot variant="think" animate="tilt" size={104} alt="" />
          <p className="bt-loading-msg">Finding your questions...</p>
        </div>
      )}

      {/* ===================== PLAYING ===================== */}
      {phase === 'playing' && questions[qIndex] && (() => {
        const cur = questions[qIndex]!;
        return (
          <div className="bp-body">
            <div className="bp-play-top">
              <span className="bp-qcount">Question {qIndex + 1} of {questions.length}</span>
              <div className="bp-ring" role="timer" aria-label={`${timeLeft} seconds left`}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={R} className="bp-ring-track" />
                  <circle cx="32" cy="32" r={R} className="bp-ring-prog" strokeDasharray={C} strokeDashoffset={C * (1 - timeLeft / QUESTION_TIME)} style={{ transition: reduceMotion ? 'none' : 'stroke-dashoffset 1s linear' }} />
                </svg>
                <span className="bp-ring-num">{timeLeft}</span>
              </div>
            </div>
            <div className="bp-progress" aria-hidden="true">
              {questions.map((_, i) => <span key={i} className={`bp-prog-dot${i === qIndex ? ' active' : i < qIndex ? ' done' : ''}`} />)}
            </div>
            <p className="bp-question" key={qIndex}>{cur.question}</p>
            <div className="bp-answers">
              {cur.options.map((opt, i) => {
                let cls = 'ans-btn bp-ans';
                if (locked) { if (i === cur.correct) cls += ' correct'; else if (i === picked) cls += ' wrong'; else cls += ' dimmed'; }
                return (
                  <button key={i} type="button" className={cls} disabled={locked} onClick={() => lockAndAdvance(i)}>
                    <span className="bp-ans-letter" aria-hidden="true">{LETTERS[i]}</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===================== REVEAL ===================== */}
      {phase === 'reveal' && ghost && (
        <div className="bp-body">
          <h1 className="bp-head bp-center">{verdictKind === 'win' ? 'You won!' : verdictKind === 'tie' ? 'So close' : 'So close'}</h1>
          <div className="bp-vs-row">
            <div className="bp-side bp-you"><span className="bp-side-label">You</span><span className="bp-side-score">{youScore}</span></div>
            <VsBadge className="bp-vs" />
            <div className="bp-side bp-them"><span className="bp-side-label">{ghost.cold ? 'Par' : ghost.handle}</span><span className="bp-side-score">{ghost.score}</span></div>
          </div>
          <p className={`bp-verdict is-${verdictKind}`}>{verdict}</p>
          <p className="bp-async-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {ghost.cold ? 'No one has battled this yet. You set the score to beat!' : `${ghost.handle} played ${ghost.played_ago}`}
          </p>

          {xpEarned > 0 && <p className="bp-xp-pill" role="status">+{xpEarned} XP</p>}

          <div className="bp-h2h">
            <div className="bp-h2h-row">
              <span className="bp-h2h-name">You</span>
              {questions.map((q, i) => { const ok = answers[i] != null && answers[i] === q.correct; return <span key={i} className={`bp-h2h-cell ${ok ? 'hit' : 'miss'}`} aria-label={`Q${i + 1}: ${ok ? 'correct' : 'missed'}`}>{ok ? CHECK : CROSS}</span>; })}
            </div>
            <div className="bp-h2h-row">
              <span className="bp-h2h-name">{ghost.cold ? 'Par' : ghost.handle}</span>
              {ghost.per_question.map((ok, i) => <span key={i} className={`bp-h2h-cell ${ok ? 'hit' : 'miss'}`} aria-label={`Q${i + 1}: opponent ${ok ? 'correct' : 'missed'}`}>{ok ? CHECK : CROSS}</span>)}
            </div>
          </div>

          <div className="bp-cta-row">
            <button type="button" className="bp-start bp-cta-half" onClick={() => {
              const url = `${window.location.origin}/battle?b=${battleId}`;
              void navigator.clipboard?.writeText(url).then(() => showToast('Battle link copied. Send it to a friend!')).catch(() => showToast('Could not copy link'));
            }}>Challenge a friend</button>
            <button type="button" className="bp-ghost-btn bp-cta-half" onClick={() => void startBattle()}>New battle</button>
          </div>

          <AddQuestionHook groupSlug={topic || null} />
        </div>
      )}

      {toast && <div className="bp-toast" role="status">{toast}</div>}
      {levelUp && !levelUpDismissed && (
        <LevelUpOverlay newLevel={levelUp.level} title={levelUp.title} titleKr={getTitleForLevel(levelUp.level).kr} onDismiss={() => setLevelUpDismissed(true)} />
      )}
    </div>
  );
}

// --- post-battle fan-pride hook (wired to /api/battle/question -> pending_questions) ---
function AddQuestionHook({ groupSlug }: { groupSlug: string | null }): React.ReactElement {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = q.trim().length > 0 && opts.every((o) => o.trim().length > 0) && correct !== null;

  const submit = async (): Promise<void> => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/battle/question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSlug, question: q.trim(), options: opts.map((o) => o.trim()), correct_index: correct }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

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
      <input id="bp-q" className="bp-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which B-side opened LE SSERAFIM's first tour?" maxLength={200} />
      <span className="bp-label">Answers (tap the circle to mark the correct one)</span>
      <div className="bp-hook-answers">
        {opts.map((o, i) => (
          <div key={i} className={`bp-hook-answer${correct === i ? ' correct' : ''}`}>
            <button type="button" className="bp-radio" aria-label={`Mark answer ${i + 1} correct`} aria-pressed={correct === i} onClick={() => setCorrect(i)}>{correct === i && <span aria-hidden="true">{CHECK}</span>}</button>
            <input className="bp-input bp-input-sm" value={o} onChange={(e) => setOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Answer ${LETTERS[i]}`} maxLength={120} aria-label={`Answer ${LETTERS[i]}`} />
          </div>
        ))}
      </div>
      <button type="button" className="bp-start" disabled={!ready || busy} onClick={() => void submit()}>Add it to battles</button>
    </div>
  );
}
