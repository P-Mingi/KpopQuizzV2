import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { checkChallenge, hasLink } from '@/lib/ux-v1/p8/validate';
import { checkText, isTrusted, underRateCap } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/challenges { play_id, message? }: the fan publishes one of THEIR
// OWN quiz runs as a public challenge ("Beat my 7/8 on ..."; DESIGN-SPEC 13.2
// CHALLENGE). The score is read from the plays row server side, never taken from the
// client. One post per run (play_id unique). NEW store community_challenges (pending
// migration v11-p8-community.sql): 503 not_live before any write until it exists.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const c = checkChallenge(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });

  try {
    if (!(await tableLive('community_challenges'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: p } = await svc.from('plays').select('id, quiz_id, player_id, score, total_questions, time_taken_seconds').eq('id', c.value.playId).maybeSingle();
  const play = p as { id: string; quiz_id: string; player_id: string | null; score: number; total_questions: number; time_taken_seconds: number | null } | null;
  if (!play || play.player_id !== user.id || !play.total_questions) return NextResponse.json({ error: 'bad_play' }, { status: 403 });
  const { data: q } = await svc.from('quizzes').select('id, group_id, status, quiz_type').eq('id', play.quiz_id).maybeSingle();
  const quiz = q as { id: string; group_id: number | null; status: string; quiz_type: string | null } | null;
  if (!quiz || quiz.status !== 'published') return NextResponse.json({ error: 'quiz_unavailable' }, { status: 409 });
  const { data: dup } = await svc.from('community_challenges').select('id').eq('play_id', play.id).maybeSingle();
  if (dup) return NextResponse.json({ error: 'already_posted', id: (dup as { id: number }).id }, { status: 409 });
  if (!await underRateCap('community_challenges', 'author', user.id, 3600, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const msg = c.value.message ?? '';
  if (msg && hasLink(msg) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  if (msg) { const hit = await checkText(msg); if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 }); }

  // Clue quizzes score up to 3 points a question (lib/ux-v1/p4/engine maxScoreFor).
  const total = quiz.quiz_type === 'guess_from_clues' ? play.total_questions * 3 : play.total_questions;
  const score = Math.max(0, Math.min(play.score, total));
  const { data, error } = await svc.from('community_challenges').insert({
    author: user.id, quiz_id: quiz.id, play_id: play.id, group_id: quiz.group_id, score, total,
    time_seconds: play.time_taken_seconds, message: c.value.message, status: 'visible',
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'already_posted' : 'post_failed' }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: (data as { id: number }).id });
}
