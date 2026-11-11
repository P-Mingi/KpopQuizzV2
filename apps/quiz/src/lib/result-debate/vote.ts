// The vote of the debate block under a quiz result. It is the NORMAL debate vote: POST /api/debate/vote { side }
// (one per user per day, the RPC cast_debate_vote). No XP, no streak, no score call: it touches nothing else.
// On success it remembers the vote on the device, tells the prefetch, and records the measure (from=result).

import { analytics } from '@/lib/analytics';
import { percents } from '@/lib/ux-v1/p8/format';

import { markVotedOnDevice, noteResultDebateVoted } from './decide';

export type DebateSide = 'a' | 'b';

export type ResultVoteOutcome =
  | { ok: true; side: DebateSide; /** the split in whole percents, null when the answer carried no counts */ pct: [number, number] | null }
  | { ok: false };

export async function castResultDebateVote(
  side: DebateSide,
  date: string,
  basePath: string,
  doFetch: typeof fetch = fetch,
): Promise<ResultVoteOutcome> {
  try {
    const r = await doFetch(`${basePath}/api/debate/vote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side }),
    });
    const body = (await r.json().catch(() => null)) as { a?: unknown; b?: unknown; error?: unknown } | null;
    if (!r.ok || body?.error) return { ok: false };
    markVotedOnDevice(date, side);
    noteResultDebateVoted();
    analytics.debateVote('result');
    const pct = body && typeof body.a === 'number' && typeof body.b === 'number' ? (percents([body.a, body.b]) as [number, number]) : null;
    return { ok: true, side, pct };
  } catch {
    return { ok: false };
  }
}
