import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createRankingSource, duelServiceClient } from '@/lib/duel/server';
import { rankQuestion } from '@/lib/duel/service';
import { duelKey, voterHash } from '@/lib/duel/token';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// GET /api/cron/fans-picked (V12 G7, SYSTEM.md 5.3) - nightly.
// For every group song question: Bradley-Terry over the whole vote log, and the
// same over the votes older than 7 days for the weekly movement
// (lib/duel/fans-picked.ts), stored in duel_song_rankings (pending SQL). Votes of
// editorial accounts never count. duel_votes is only read.
// ?dry=1 computes and answers without writing anything.
// Flag off: 404, nothing runs. SQL not applied: answers ok:false, nothing runs.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GUARD_KEEP_DAYS = 2;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = duelServiceClient();
  const key = duelKey();
  if (!db || !key) return NextResponse.json({ ok: false, reason: 'not_configured' });
  const dry = req.nextUrl.searchParams.get('dry') === '1';

  if (!dry) {
    const probe = await db.from('duel_song_rankings').select('entity_id', { head: true, count: 'exact' }).limit(1);
    if (probe.error) return NextResponse.json({ ok: false, reason: 'not_applied' });
  }

  const source = createRankingSource(db);
  const now = Date.now();
  const computedAt = new Date(now).toISOString();
  try {
    const excluded = new Set((await source.editorialUserIds()).map((id) => voterHash(key, `u:${id}`)));
    const groups: Array<{ group: string; votes: number; votesPrev: number; ranked: boolean; songs: number; rankedSongs: number }> = [];
    for (const question of await source.questions()) {
      const [entityIds, votes] = await Promise.all([source.entityIds(question.id), source.votes(question.id)]);
      const run = rankQuestion({ question, entityIds, votes, now, excludedVoters: excluded });
      if (!dry) await source.save(question, run.rows, { votes: run.totalVotes, votesPrev: run.prevTotalVotes }, computedAt);
      groups.push({ group: question.groupSlug, votes: run.totalVotes, votesPrev: run.prevTotalVotes, ranked: run.ranked, songs: run.rows.length, rankedSongs: run.rows.filter((r) => r.rank !== null).length });
    }
    if (!dry) await source.pruneGuard(new Date(now - GUARD_KEEP_DAYS * 86_400_000).toISOString().slice(0, 10));
    return NextResponse.json({ ok: true, dry, computedAt, editorialExcluded: excluded.size, groups });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'failed', message: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
