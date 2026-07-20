'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { completeDaily } from '@/lib/daily-played';
import { ResultLoop } from '@/components/result/result-loop';
import { useSignedIn } from '@/lib/use-signed-in';
import { analytics, isDailyLaunch } from '@/lib/analytics';
import { RankingList } from './ranking-list';
import { VsBadge } from './vs-badge';

export interface QuestionItem {
  group_slug: string;
  question_type: string;
  prompt: string;
  entity_kind: string;
  total_votes: number;
  public: boolean;
}

interface Option {
  entity_id: string;
  name: string;
  image: string | null;
  elo: number;
}

interface RankEntity {
  entity_id: string;
  name: string;
  image: string | null;
  elo: number;
}

interface Duel {
  questionId: string;
  a: Option;
  b: Option;
}

interface Reveal {
  winnerId: string;
  delta: Record<string, number>;
  pct: Record<string, number>;
}

interface Props {
  questions: QuestionItem[];
  initialKey: string; // `${group}:${type}`
  initialPrompt: string;
  initialTotalVotes: number;
  initialRanking: RankEntity[];
}

const keyOf = (q: { group_slug: string; question_type: string }) => `${q.group_slug}:${q.question_type}`;
const labelOf = (qtype: string) => qtype.replace(/-/g, ' ');

export function DuelGame({
  questions,
  initialKey,
  initialPrompt,
  initialTotalVotes,
  initialRanking,
}: Props): React.ReactElement {
  const signedIn = useSignedIn();
  const [selected, setSelected] = useState(initialKey);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [duel, setDuel] = useState<Duel | null>(null);
  const [locked, setLocked] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [ranking, setRanking] = useState<RankEntity[]>(initialRanking);
  const [bumped, setBumped] = useState<Set<string>>(new Set());
  const [lastWin, setLastWin] = useState<{ id: string; delta: number } | null>(null);
  const [sessionVotes, setSessionVotes] = useState(0);
  const [duelLoading, setDuelLoading] = useState(true);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [group, type] = selected.split(':') as [string, string];

  const loadDuel = useCallback(async (g: string, t: string) => {
    setDuelLoading(true);
    setLocked(false);
    setReveal(null);
    try {
      const res = await fetch(`/api/duels/next?group=${encodeURIComponent(g)}&type=${encodeURIComponent(t)}`);
      if (res.ok) {
        const data = (await res.json()) as { a: Option; b: Option; question: { id: string } };
        setDuel({ questionId: data.question.id, a: data.a, b: data.b });
      }
    } finally {
      setDuelLoading(false);
    }
  }, []);

  const loadRanking = useCallback(async (g: string, t: string) => {
    const res = await fetch(`/api/rankings/${encodeURIComponent(g)}/${encodeURIComponent(t)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      total_votes: number;
      question: { prompt: string };
      entities: RankEntity[];
    };
    setTotalVotes(data.total_votes);
    setPrompt(data.question.prompt);
    setRanking(data.entities);
    setLastWin(null);
    setBumped(new Set());
  }, []);

  // Initial duel for the SSR-selected question (ranking is already SSR'd).
  useEffect(() => {
    analytics.gameStart('duel', isDailyLaunch());
    void loadDuel(group, type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (nextTimer.current) clearTimeout(nextTimer.current);
  }, []);

  function pickQuestion(q: QuestionItem): void {
    if (nextTimer.current) clearTimeout(nextTimer.current);
    const k = keyOf(q);
    setSelected(k);
    setPrompt(q.prompt);
    setTotalVotes(q.total_votes);
    void loadDuel(q.group_slug, q.question_type);
    void loadRanking(q.group_slug, q.question_type);
  }

  async function vote(winnerId: string): Promise<void> {
    if (!duel || locked) return;
    const { a, b, questionId } = duel;

    // Pre-vote crowd odds (Elo expected score) drive the reveal bars.
    const expA = 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
    const pctA = Math.round(expA * 100);
    const pct: Record<string, number> = { [a.entity_id]: pctA, [b.entity_id]: 100 - pctA };

    setLocked(true);

    let res: Response;
    try {
      res = await fetch('/api/duels/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          option_a_id: a.entity_id,
          option_b_id: b.entity_id,
          winner_id: winnerId,
        }),
      });
    } catch {
      setLocked(false);
      return;
    }
    if (!res.ok) {
      setLocked(false);
      return;
    }

    const { ratings } = (await res.json()) as {
      ratings: Array<{ entity_id: string; elo: number; last_delta: number }>;
    };
    const delta: Record<string, number> = {};
    const newElo: Record<string, number> = {};
    for (const r of ratings) {
      delta[r.entity_id] = r.last_delta;
      newElo[r.entity_id] = r.elo;
    }

    setReveal({ winnerId, delta, pct });
    // This game has no end, so the first vote of the session is what "complete"
    // means here, matching what completeDaily already counts as having played.
    if (sessionVotes === 0) analytics.gameComplete('duel', 1, 1, isDailyLaunch());
    setSessionVotes((n) => n + 1);
    setTotalVotes((n) => n + 1);
    // F6: a duel has no end screen, so casting a vote on today's daily matchup
    // (linked with daily=game) counts as having played the daily game.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daily') === 'game') {
      void completeDaily('game');
    }

    // Apply new Elo to the moved entities, reorder, bump.
    setRanking((prev) => {
      const next = prev.map((e) => (e.entity_id in newElo ? { ...e, elo: newElo[e.entity_id]! } : e));
      next.sort((x, y) => y.elo - x.elo);
      return next;
    });
    setLastWin({ id: winnerId, delta: delta[winnerId] ?? 0 });
    setBumped(new Set(Object.keys(newElo)));

    // Continuous flow: load the next pair shortly after the reveal.
    nextTimer.current = setTimeout(() => {
      setBumped(new Set());
      void loadDuel(group, type);
    }, 1500);
  }

  function renderCard(opt: Option, side: 'a' | 'b'): React.ReactElement {
    const isWinner = reveal?.winnerId === opt.entity_id;
    const cls = ['opt'];
    if (locked) cls.push('locked');
    if (reveal) cls.push(isWinner ? 'picked' : 'notpicked');
    if (reveal && isWinner) cls.push('pop');
    const pct = reveal?.pct[opt.entity_id];
    const d = reveal?.delta[opt.entity_id];
    return (
      <button
        type="button"
        className={cls.join(' ')}
        onClick={() => vote(opt.entity_id)}
        disabled={locked || duelLoading}
        aria-label={`Vote for ${opt.name}`}
      >
        {opt.image ? (
          <img className="opt-img" src={opt.image} alt={opt.name} loading="lazy" />
        ) : (
          <span className="opt-img" />
        )}
        <span className="opt-body">
          <span className="opt-name">{opt.name}</span>
          <span className="opt-sub">{side === 'a' ? 'tap to pick' : 'tap to pick'}</span>
        </span>
        <span className="opt-result">
          <span className="opt-result-inner">
            <span className="opt-bar">
              <span className="opt-bar-fill" style={{ width: reveal ? `${pct ?? 0}%` : 0 }} />
            </span>
            <span className="opt-pct">{reveal ? `${pct ?? 0}%` : ''}</span>
            {reveal && d !== undefined && (
              <span className={`opt-delta ${d >= 0 ? 'up' : 'down'}`}>
                {d >= 0 ? `+${d}` : d}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="duel-wrap">
      {/* Picker (5f) */}
      <div className="duel-pickers">
        <p className="duel-pick-label">Pick a matchup</p>
        <div className="duel-pills" aria-label="Duel matchups">
          {questions.map((q) => {
            const k = keyOf(q);
            const active = k === selected;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                className={`duel-pill${active ? ' active' : ''}`}
                onClick={() => pickQuestion(q)}
              >
                {q.group_slug === 'general' ? labelOf(q.question_type) : `${q.group_slug} ${labelOf(q.question_type)}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header (5a) */}
      <p className="duel-label">This or that</p>
      <h1 className="duel-prompt">{prompt}</h1>
      <p className="duel-meta">{totalVotes.toLocaleString('en-US')} fans have voted on this matchup</p>

      {/* Duel (5b + 5c). F4: on FIRST load only (no matchup yet) show the think
          mascot. Next-pair fetches keep the previous pair on screen, so the
          mascot never appears mid-play. */}
      {duel ? (
        <div className="duel-grid">
          {renderCard(duel.a, 'a')}
          <VsBadge />
          {renderCard(duel.b, 'b')}
        </div>
      ) : (
        <div className="duel-loading" role="status" aria-live="polite">
          <Mascot variant="think" animate="tilt" size={104} alt="" />
          <p className="duel-loading-msg">Finding a matchup...</p>
        </div>
      )}

      {/* Controls + tally */}
      <div className="duel-controls">
        <button type="button" className="duel-btn" onClick={() => loadDuel(group, type)} disabled={duelLoading}>
          {locked ? 'Next pair' : 'Skip'}
        </button>
      </div>
      <p className="duel-tally">Your votes this session: {sessionVotes}</p>

      {/* Live ranking (5e) - shared with the /rankings pages */}
      <RankingList
        title={prompt}
        badge={<span className="rank-live"><span className="rank-live-dot" />Live</span>}
        entities={ranking}
        variant="delta"
        bumped={bumped}
        winnerId={lastWin?.id ?? null}
        winnerDelta={lastWin?.delta ?? 0}
        footer={{ href: `/rankings/${group}/${type}`, label: 'See full ranking page →' }}
      />

      {/* Workstream LOOP - this game has no result phase, it is an endless
          vote loop, so a player who stops voting hits the bottom of the ranking
          and has nowhere to go. The shared footer appears once they have
          actually voted, which turns that dead end into the same loop every
          other game ends in.

          No group is passed on purpose: `group` is the matchup's category, not
          the player's bias, so the cross-promo goes to /quizzes rather than
          claiming a group they never chose. */}
      {sessionVotes > 0 && (
        <ResultLoop
          game="duel"
          shareText={`I voted on "${prompt}" on kpopquiz.org. What would you pick?`}
          shareUrl="/games/this-or-that"
          onPlayAgain={() => { void loadDuel(group, type); }}
          playAgainLabel="Next matchup"
          isSignedIn={signedIn !== false}
        />
      )}
    </div>
  );
}
