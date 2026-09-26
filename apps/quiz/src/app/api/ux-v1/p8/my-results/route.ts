import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { timeAgo } from '@/lib/ux-v1/p8/format';

// GET /api/ux-v1/p8/my-results: the signed-in fan's 5 latest quiz runs (their own
// plays rows), for the editor's "Your score to beat" picker (Challenge mode). Read
// only, own rows only (player_id = the session user).
export const dynamic = 'force-dynamic';

function clock(sec: number | null): string | null {
  if (sec === null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: plays, error } = await svc.from('plays').select('id, quiz_id, score, total_questions, time_taken_seconds, created_at')
    .eq('player_id', user.id).gt('total_questions', 0).order('created_at', { ascending: false }).limit(5);
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const rows = (plays ?? []) as { id: string; quiz_id: string; score: number; total_questions: number; time_taken_seconds: number | null; created_at: string }[];
  if (!rows.length) return NextResponse.json({ results: [] }, { headers: { 'cache-control': 'private, no-store' } });
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
  return NextResponse.json({ results }, { headers: { 'cache-control': 'private, no-store' } });
}
