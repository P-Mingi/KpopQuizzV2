'use client';

import { useEffect, useRef, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { getAnonId } from '@/lib/anon-id';

import type { DuelPair, DuelSong, PairsResponse, VoteResponse } from '@/lib/duel/types';

/**
 * This or that bonus card (V12 G7, SYSTEM.md 5.3, prototype #e-tot): after a quiz
 * result, two songs of the quiz's group, tap one, see the real split, up to 5 pairs
 * in a row, Skip ends it. Songs only.
 *
 * Renders nothing until the server hands out pairs (GET /api/duel/pairs), so a
 * group without a song question, a browser without storage, or a database where
 * the G7 SQL is not applied simply has no card. Every number comes from the vote
 * (POST /api/duel/vote): a pair with too few votes shows no split.
 * Mounted by components/quiz/ux-v1/results.tsx only when isUxV12().
 */

/** Typographic grounds behind the cover (A1's theme tokens), by position like the prototype. */
const GROUNDS = ['ux-th-hits26', 'ux-th-gen5', 'ux-th-viral', 'ux-th-title', 'ux-th-gen4'] as const;

type Side = 'a' | 'b';
interface Voted {
  side: Side;
  /** null while the answer is on its way, or when the pair has too few votes for a split */
  split: VoteResponse['split'];
  state: 'sending' | 'ok' | 'already' | 'failed';
}

/** Deezer serves any square size: ask for a small one instead of the 1000px original. */
export function coverThumb(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+-/, '/264x264-');
}

function isPairs(v: unknown): v is PairsResponse {
  if (!v || typeof v !== 'object') return false;
  const pairs = (v as { pairs?: unknown }).pairs;
  return Array.isArray(pairs) && pairs.every((p) => {
    const pair = p as Partial<DuelPair> | null;
    return Boolean(pair && typeof pair.token === 'string' && pair.a && pair.b && typeof pair.a.title === 'string' && typeof pair.b.title === 'string');
  });
}

function parseSplit(v: unknown): VoteResponse['split'] {
  const s = (v as { split?: unknown } | null)?.split as { a?: unknown; b?: unknown; total?: unknown } | null | undefined;
  if (!s || typeof s.a !== 'number' || typeof s.b !== 'number' || typeof s.total !== 'number') return null;
  if (s.a < 0 || s.b < 0 || s.a + s.b !== 100 || s.total <= 0) return null;
  return { a: s.a, b: s.b, total: s.total };
}

export function ThisOrThatBonus({ groupSlug, groupName }: { groupSlug: string; groupName: string }): React.ReactElement | null {
  const [data, setData] = useState<PairsResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [voted, setVoted] = useState<Voted | null>(null);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const anon = useRef<string | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const id = getAnonId();
    anon.current = id;
    let cancelled = false;
    fetch(`/api/duel/pairs?group=${encodeURIComponent(groupSlug)}`, { credentials: 'include', headers: id ? { 'x-duel-anon': id } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: unknown) => { if (!cancelled && isPairs(raw) && raw.pairs.length > 0) setData(raw); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [groupSlug]);

  // keyboard: after a vote the next step is under the fingers; after Next, the new pair
  useEffect(() => {
    if (voted && voted.state !== 'sending' && voted.state !== 'failed') next.current?.focus({ preventScroll: true });
  }, [voted]);
  useEffect(() => {
    if (moved.current) first.current?.focus({ preventScroll: true });
  }, [index]);

  if (!data) return null;
  const total = data.pairs.length;
  const fandom = data.group?.fandom ?? null;
  const who = fandom ?? 'fans';

  if (done) {
    // Skip before any vote: nothing to thank for, the card leaves.
    if (count === 0) return null;
    return (
      <section className="ux-tot" data-testid="tot" data-state="done" aria-labelledby="tot-h">
        <span className="ux-kicker"><Icon name="check" />Bonus done</span>
        <h2 id="tot-h">{data.ranked
          ? <>Thanks. Your votes are in {fandom ? `${fandom}'s` : 'the fans'} top 10.</>
          : <>Thanks. Your votes count toward {fandom ? `${fandom}'s` : 'the fans'} top 10.</>}</h2>
        <div className="ux-tot-f">
          <span>{count} of {total} {total === 1 ? 'pair' : 'pairs'}</span>
          {data.ranked ? <UxButton variant="ghost" size="sm" href={`/${groupSlug}-quiz#fans-picked`}>See what {who} picked</UxButton> : null}
        </div>
      </section>
    );
  }

  const pair = data.pairs[index];
  if (!pair) return null;
  const settled = voted !== null && voted.state !== 'failed';

  const vote = (side: Side): void => {
    if (voted && voted.state !== 'failed') return;
    setVoted({ side, split: null, state: 'sending' });
    fetch('/api/duel/vote', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(anon.current ? { 'x-duel-anon': anon.current } : {}) },
      body: JSON.stringify({ token: pair.token, winner: side }),
    })
      .then(async (r) => ({ ok: r.ok, body: (await r.json().catch(() => null)) as unknown }))
      .then(({ ok, body }) => {
        if (!ok) { setVoted({ side, split: null, state: 'failed' }); return; }
        const already = (body as { status?: unknown } | null)?.status === 'already_voted';
        if (!already) setCount((c) => c + 1);
        setVoted({ side, split: parseSplit(body), state: already ? 'already' : 'ok' });
      })
      .catch(() => setVoted({ side, split: null, state: 'failed' }));
  };

  const advance = (): void => {
    moved.current = true;
    setVoted(null);
    if (index + 1 >= total) setDone(true);
    else setIndex(index + 1);
  };

  const split = settled ? voted.split : null;
  const mine = split && voted ? (voted.side === 'a' ? split.a : split.b) : null;

  const option = (side: Side, song: DuelSong, ground: string): React.ReactElement => {
    const picked = settled && voted.side === side;
    const share = split ? (side === 'a' ? split.a : split.b) : null;
    const thumb = coverThumb(song.cover);
    return (
      <button
        type="button"
        ref={side === 'a' ? first : undefined}
        className={`ux-toto ${ground}${picked ? ' is-picked' : ''}`}
        onClick={() => vote(side)}
        aria-disabled={settled || voted?.state === 'sending' ? true : undefined}
        aria-pressed={settled ? picked : undefined}
        data-side={side}
      >
        <span className="ux-toto-cov" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- Deezer album cover, decorative, sized by CSS */}
          {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : null}
        </span>
        <b>{song.title}</b>
        <small>{groupName}{song.year !== null ? ` · ${song.year}` : ''}</small>
        {share !== null ? <span className="ux-toto-pc ux-num">{share}%</span> : null}
        <span className="ux-toto-fill" style={share !== null ? { width: `${share}%` } : undefined} aria-hidden="true" />
      </button>
    );
  };

  let message: React.ReactNode = 'Tap the one you replay more.';
  if (voted?.state === 'failed') message = 'Your vote was not saved. Tap again.';
  else if (voted?.state === 'sending') message = 'Saving your vote.';
  else if (voted && mine !== null) message = voted.state === 'already'
    ? <>You already voted on this pair today. <b>{mine}%</b> of {who} agree.</>
    : <>You agree with <b>{mine}%</b> of {who}</>;
  else if (voted?.state === 'already') message = 'You already voted on this pair today.';
  else if (voted) message = 'Vote counted. This pair needs more votes before it shows a split.';

  return (
    <section className="ux-tot" data-testid="tot" data-state={settled ? 'voted' : 'open'} aria-labelledby="tot-h">
      <div className="ux-tot-h">
        <div>
          <span className="ux-kicker"><Icon name="zap" />Bonus · This or that</span>
          <h2 id="tot-h">Which one do you replay more?</h2>
        </div>
        <div className="ux-tot-dots" role="img" aria-label={`Pair ${index + 1} of ${total}`}>
          {data.pairs.map((p, k) => <i key={p.token} className={k <= index ? 'is-on' : undefined} />)}
        </div>
      </div>
      <div className={`ux-tot-g${settled ? ' is-voted' : ''}`} key={pair.token}>
        {option('a', pair.a, GROUNDS[index % 5] as string)}
        <span className="ux-tot-vs">or</span>
        {option('b', pair.b, GROUNDS[(index + 2) % 5] as string)}
      </div>
      <div className="ux-tot-f">
        <span role="status" data-testid="tot-msg">{message}</span>
        {settled
          ? <button type="button" className="ux-btn ux-btn-primary ux-btn-sm" ref={next} onClick={advance}>{index < total - 1 ? 'Next pair' : 'Finish'}</button>
          : <button type="button" className="ux-lnk" onClick={() => setDone(true)}>Skip</button>}
      </div>
    </section>
  );
}
