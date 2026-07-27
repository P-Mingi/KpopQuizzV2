import { createServiceRoleClient } from '@/lib/supabase/server';
import { RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * Nightly duel Elo reconciliation (Pipeline 1, Section 2b + 4c gate).
 *
 * For every duel_question WHOSE real duel_votes count has reached its min_votes:
 * reset its entities to Elo 1500 / 0-0, then REPLAY all of its duel_votes in
 * created_at order applying the same plain Elo math as the cast_duel_vote RPC
 * (K=24), and overwrite duel_ratings via the service role. Questions still below
 * their min_votes are SKIPPED so their C2 seed ratings stay intact until real
 * votes validate them. Idempotent: running it twice yields identical ratings.
 *
 * Triggered by Vercel Cron or manually with CRON_SECRET.
 */
export const dynamic = 'force-dynamic';

const K = 24;

interface RatingState {
  entityName: string;
  entityImage: string | null;
  elo: number;
  wins: number;
  losses: number;
  lastDelta: number;
}

/** Plain Elo, K=24. Mirrors public.cast_duel_vote exactly. */
function applyElo(winner: RatingState, loser: RatingState): void {
  const expectedW = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  const delta = Math.round(K * (1 - expectedW));
  winner.elo += delta;
  winner.wins += 1;
  winner.lastDelta = delta;
  loser.elo -= delta;
  loser.losses += 1;
  loser.lastDelta = -delta;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: questions, error: qErr } = await supabase
    .from('duel_questions')
    .select('id, min_votes');
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  let reconciled = 0;
  let skipped = 0;
  let entitiesUpdated = 0;
  let votesReplayed = 0;

  for (const question of questions ?? []) {
    const questionId = question.id as string;
    // V closeout: gate on the shared unlock threshold, not the per-question
    // min_votes column, so display + reconcile agree on when a ranking is real.
    const minVotes = RANKING_UNLOCK_VOTES;

    // Replay set, oldest-first.
    const { data: votes, error: vErr } = await supabase
      .from('duel_votes')
      .select('option_a_id, option_b_id, winner_id, created_at')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });
    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    // 4c gate: below min_votes, leave the seeded ratings untouched.
    if ((votes?.length ?? 0) < minVotes) {
      skipped += 1;
      continue;
    }

    // Existing entities, reset to the 1500 baseline.
    const { data: ratings, error: rErr } = await supabase
      .from('duel_ratings')
      .select('entity_id, entity_name, entity_image')
      .eq('question_id', questionId);
    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    const state = new Map<string, RatingState>();
    for (const r of ratings ?? []) {
      state.set(r.entity_id as string, {
        entityName: r.entity_name as string,
        entityImage: (r.entity_image as string | null) ?? null,
        elo: 1500,
        wins: 0,
        losses: 0,
        lastDelta: 0,
      });
    }

    for (const v of votes ?? []) {
      const winnerId = v.winner_id as string;
      const loserId =
        winnerId === v.option_a_id ? (v.option_b_id as string) : (v.option_a_id as string);
      const winner = state.get(winnerId);
      const loser = state.get(loserId);
      if (!winner || !loser) continue; // entity no longer in ratings; skip
      applyElo(winner, loser);
      votesReplayed += 1;
    }

    const rows = [...state.entries()].map(([entityId, s]) => ({
      question_id: questionId,
      entity_id: entityId,
      entity_name: s.entityName,
      entity_image: s.entityImage,
      elo: s.elo,
      wins: s.wins,
      losses: s.losses,
      last_delta: s.lastDelta,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from('duel_ratings')
        .upsert(rows, { onConflict: 'question_id,entity_id' });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      entitiesUpdated += rows.length;
    }
    reconciled += 1;
  }

  return NextResponse.json({
    ok: true,
    questions: questions?.length ?? 0,
    reconciled,
    skipped,
    entities_updated: entitiesUpdated,
    votes_replayed: votesReplayed,
  });
}
