import { createHash } from 'crypto';

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * POST /api/duels/vote
 * Body: { question_id, option_a_id, option_b_id, winner_id }
 *
 * Derives voter_hash server-side from sha256(ip + day) (same privacy-safe hashing
 * as /api/share/click) and calls the cast_duel_vote RPC (SECURITY DEFINER), which
 * records the vote + applies Elo atomically. Returns the two updated ratings so
 * the client can animate the delta.
 */
export const dynamic = 'force-dynamic';

interface VoteBody {
  question_id?: string;
  option_a_id?: string;
  option_b_id?: string;
  winner_id?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: VoteBody;
  try {
    body = (await req.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { question_id, option_a_id, option_b_id, winner_id } = body;
  if (!question_id || !option_a_id || !option_b_id || !winner_id) {
    return NextResponse.json(
      { error: 'question_id, option_a_id, option_b_id, winner_id are required' },
      { status: 400 },
    );
  }
  if (winner_id !== option_a_id && winner_id !== option_b_id) {
    return NextResponse.json({ error: 'winner_id must be option_a_id or option_b_id' }, { status: 400 });
  }

  // voter_hash = sha256(ip + day), privacy-safe + once-per-day-per-ip granularity.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const voterHash = createHash('sha256').update(`${ip}:${day}`).digest('hex').slice(0, 16);

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('cast_duel_vote', {
    p_question_id: question_id,
    p_option_a_id: option_a_id,
    p_option_b_id: option_b_id,
    p_winner_id: winner_id,
    p_voter_hash: voterHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ratings = (data ?? []) as Array<{ entity_id: string; elo: number; last_delta: number }>;
  return NextResponse.json({ ratings });
}
