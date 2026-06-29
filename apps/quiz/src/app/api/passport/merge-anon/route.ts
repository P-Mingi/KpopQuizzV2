import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Passport anon merge (M0.2). Reuses the create-funnel claim-on-auth pattern:
// the client holds its anonymous accumulation in localStorage and, on first
// sign-in, POSTs those counters here to be folded into the passport spine ONCE.
//
// Idempotency + safety live in the DB:
//  - merge_anon_passport atomically claims a one-time flag (passport_anon_merged_at);
//    a second call deposits nothing.
//  - amounts are client-supplied and untrusted, so the RPC clamps every value.
// We attribute to the validated session user_id (auth.uid()), never to client
// input, and never reverse-look-up ephemeral voter_hash / player_hash rows.
export const dynamic = 'force-dynamic';

function toInt(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    // empty body is fine (nothing to merge)
  }

  const groupStats = Array.isArray(body.group_stats)
    ? (body.group_stats as unknown[]).slice(0, 200).map((g) => {
        const o = (g && typeof g === 'object' ? g : {}) as Record<string, unknown>;
        return {
          group_id: toInt(o.group_id),
          songs_played: toInt(o.songs_played),
          songs_correct: toInt(o.songs_correct),
        };
      })
    : [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('merge_anon_passport', {
    p_user_id: user.id,
    p_quizzes_played: toInt(body.quizzes_played),
    p_blindtests_played: toInt(body.blindtests_played),
    p_duels_voted: toInt(body.duels_voted),
    p_battles_played: toInt(body.battles_played),
    p_group_stats: groupStats,
  });

  if (error) {
    console.error('merge_anon_passport failed:', error.message);
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 });
  }

  // data === true  -> merged this call; false -> already merged before (no-op).
  return NextResponse.json({ merged: data === true });
}
