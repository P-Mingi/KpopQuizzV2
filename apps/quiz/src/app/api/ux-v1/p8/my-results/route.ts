import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { timeAgo } from '@/lib/ux-v1/p8/format';

import type { NextRequest } from 'next/server';

// GET /api/ux-v1/p8/my-results[?quiz=<slug>]: the signed-in fan's 5 latest quiz runs
// (their own plays rows), for the editor's "Your score to beat" picker (Challenge
// mode). With ?quiz= (P5's create done link /community?compose=challenge&quiz=<slug>)
// only the runs of that published quiz, plus { quiz: { slug, title } } for the line
// shown when the fan has not played it yet. Read only, own rows only (player_id = the
// session user).
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,150}$/i;

function clock(sec: number | null): string | null {
  if (sec === null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const slugParam = req.nextUrl.searchParams.get('quiz');
  if (slugParam !== null && !SLUG_RE.test(slugParam)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const svc = createServiceRoleClient();
  const noStore = { headers: { 'cache-control': 'private, no-store' } };
  let only: { id: string; slug: string; title: string } | null = null;
  if (slugParam !== null) {
    const { data: q, error: qErr } = await svc.from('quizzes').select('id, slug, title, status').eq('slug', slugParam).maybeSingle();
    if (qErr) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    const quiz = q as { id: string; slug: string; title: string; status: string } | null;
    // A challenge needs a playable quiz: an unknown or unpublished slug lists nothing.
    if (!quiz || quiz.status !== 'published') return NextResponse.json({ results: [], quiz: null }, noStore);
    only = { id: quiz.id, slug: quiz.slug, title: quiz.title };
  }
  let playsQ = svc.from('plays').select('id, quiz_id, score, total_questions, time_taken_seconds, created_at')
    .eq('player_id', user.id).gt('total_questions', 0);
  if (only) playsQ = playsQ.eq('quiz_id', only.id);
  const { data: plays, error } = await playsQ.order('created_at', { ascending: false }).limit(5);
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const quizOut = only ? { quiz: { slug: only.slug, title: only.title } } : {};
  const rows = (plays ?? []) as { id: string; quiz_id: string; score: number; total_questions: number; time_taken_seconds: number | null; created_at: string }[];
  if (!rows.length) return NextResponse.json({ results: [], ...quizOut }, noStore);
  const { data: qs } = await svc.from('quizzes').select('id, title, cover_image_url, status, group_id, quiz_type').in('id', [...new Set(rows.map((r) => r.quiz_id))]);
  const quizzes = new Map(((qs ?? []) as { id: string; title: string; cover_image_url: string | null; status: string; group_id: number | null; quiz_type: string | null }[]).map((q) => [q.id, q] as const));
  const gids = [...new Set([...quizzes.values()].map((q) => q.group_id).filter((g): g is number => g !== null))];
  const { data: gs } = gids.length ? await svc.from('groups').select('id, slug').in('id', gids) : { data: [] };
  const slug = new Map(((gs ?? []) as { id: number; slug: string }[]).map((g) => [g.id, g.slug] as const));
  const now = Date.now();
  const results = rows.map((r) => {
    const q = quizzes.get(r.quiz_id);
    if (!q || q.status !== 'published') return null; // a challenge needs a playable quiz
    // Clue quizzes score up to 3 points a question (the rule of lib/ux-v1/p4/engine maxScoreFor).
    const outOf = q.quiz_type === 'guess_from_clues' ? r.total_questions * 3 : r.total_questions;
    return {
      id: r.id,
      label: `${r.score}/${outOf} · ${q.title}`,
      sub: [timeAgo(r.created_at, now), clock(r.time_taken_seconds)].filter(Boolean).join(' · '),
      thumb: q.cover_image_url ?? groupPhotoUrl(q.group_id !== null ? slug.get(q.group_id) : null),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  return NextResponse.json({ results, ...quizOut }, noStore);
}
