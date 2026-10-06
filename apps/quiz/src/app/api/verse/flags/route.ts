import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { resolveEntityGroupId } from '@/lib/verse/curate';
import { underRateCap } from '@/lib/verse/moderation';
import { reportIsCommunity } from '@/lib/ux-v1/p8/community-write';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// W4.8 - patrol flags. POST: a user reports a comment. GET: a curator's patrol queue for a
// space (open flags + target previews). PATCH: resolve / dismiss / hide (curator).
export const dynamic = 'force-dynamic';

type ReportType = 'comment' | 'thread' | 'essay' | 'debate' | 'challenge' | 'reply';
const REPORT_TYPES: readonly ReportType[] = ['comment', 'thread', 'essay', 'debate', 'challenge', 'reply'];
type Svc = ReturnType<typeof createServiceRoleClient>;

/** The reported row: its group and whether it is public now. Null = unknown. */
async function reportTarget(svc: Svc, type: ReportType, id: number): Promise<{ groupId: number | null; visible: boolean } | null> {
  if (type === 'comment') {
    const { data } = await svc.from('verse_discussions').select('id, entity_type, entity_id, status').eq('id', id).maybeSingle();
    const c = data as { entity_type: string; entity_id: string; status: string } | null;
    if (!c) return null;
    return { groupId: await resolveEntityGroupId(c.entity_type, c.entity_id), visible: c.status === 'visible' };
  }
  const table = { thread: 'verse_threads', essay: 'verse_essays', debate: 'community_debates', challenge: 'community_challenges', reply: 'community_replies' }[type];
  const cols = type === 'reply' ? 'id, status' : 'id, group_id, status';
  const { data } = await svc.from(table).select(cols).eq('id', id).maybeSingle();
  const r = data as { group_id?: number | null; status: string } | null;
  if (!r) return null;
  return { groupId: r.group_id ?? null, visible: type === 'essay' ? r.status === 'featured' : r.status === 'visible' };
}

// v12 (owner, 2026-10-06): a report on community content (any of REPORT_TYPES) passes the
// gate (verseWriteGate + community-write.ts); one report per account and content (unique
// index); the 3rd open report by 3 different accounts hides the content (trigger
// verse_flags_autohide, migration v12-community-posts.sql). A Verse comment report is as before.
const VOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A vote comment of the daily debate: shown while it has text and no 3-report hide. */
async function voteCommentShown(svc: Svc, ref: string): Promise<boolean | null> {
  const { data } = await svc.from('debate_votes').select('id, comment, comment_hidden_at').eq('id', ref).maybeSingle();
  const v = data as { comment: string | null; comment_hidden_at: string | null } | null;
  if (!v || !v.comment?.trim()) return null;
  return v.comment_hidden_at === null;
}

/** v12 (owner, 2026-10-06): a report on a vote comment of the daily debate. Its id is a
 *  uuid, so it rides in target_ref (target_id 0, migration v12-community-comments.sql);
 *  one report per account, and the 3rd hides the comment (the vote still counts). */
async function reportVoteComment(body: Record<string, unknown>): Promise<NextResponse> {
  const ref = String(body.target_ref ?? '').toLowerCase();
  if (!isUxV12() || !VOTE_ID.test(ref)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!await underRateCap('verse_flags', 'reporter', user.id, 3600, 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const svc = createServiceRoleClient();
  if (!(await voteCommentShown(svc, ref))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const reason = body.reason ? String(body.reason).slice(0, 200) : 'Reported by a member';
  const { error } = await svc.from('verse_flags').insert({ target_type: 'debate_vote', target_id: 0, target_ref: ref, group_id: null, reporter: user.id, reason, status: 'open' });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_reported' }, { status: 409 });
    return NextResponse.json({ error: 'report_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hidden: (await voteCommentShown(svc, ref)) === false });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  if (body.target_type === 'debate_vote') return reportVoteComment(body);
  const targetType = String(body.target_type) as ReportType;
  const targetId = Number(body.target_id);
  const community = REPORT_TYPES.includes(targetType) && await reportIsCommunity(targetType, targetId);
  if (!targetId || !(community ? REPORT_TYPES.includes(targetType) : targetType === 'comment')) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!await underRateCap('verse_flags', 'reporter', user.id, 3600, 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const svc = createServiceRoleClient();
  const target = await reportTarget(svc, targetType, targetId);
  if (!target || !target.visible) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const reason = body.reason ? String(body.reason).slice(0, 200) : 'Reported by a member';
  const { error } = await svc.from('verse_flags').insert({ target_type: targetType, target_id: targetId, group_id: target.groupId, reporter: user.id, reason, status: 'open' });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_reported' }, { status: 409 });
    return NextResponse.json({ error: 'report_failed' }, { status: 500 });
  }
  // The trigger ran inside that insert: is the content hidden now (the 3rd report)?
  const after = await reportTarget(svc, targetType, targetId);
  return NextResponse.json({ ok: true, hidden: !!after && !after.visible });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_flags').select('id, target_type, target_id, reporter, reason, created_at').eq('group_id', groupId).eq('status', 'open').order('created_at', { ascending: false }).limit(100);
  const flags = (data ?? []) as Array<{ id: number; target_type: string; target_id: number; reporter: string | null; reason: string; created_at: string }>;

  // Attach a preview of each target.
  const commentIds = flags.filter((f) => f.target_type === 'comment').map((f) => f.target_id);
  const sugIds = flags.filter((f) => f.target_type === 'suggestion').map((f) => f.target_id);
  const [{ data: comments }, { data: sugs }] = await Promise.all([
    commentIds.length ? svc.from('verse_discussions').select('id, body, status').in('id', commentIds) : Promise.resolve({ data: [] }),
    sugIds.length ? svc.from('verse_edit_suggestions').select('id, summary, status').in('id', sugIds) : Promise.resolve({ data: [] }),
  ]);
  const commentById = new Map((comments ?? []).map((c: { id: number; body: string; status: string }) => [c.id, c]));
  const sugById = new Map((sugs ?? []).map((s: { id: number; summary: string | null; status: string }) => [s.id, s]));

  return NextResponse.json({ flags: flags.map((f) => ({
    ...f,
    preview: f.target_type === 'comment' ? (commentById.get(f.target_id)?.body ?? '(deleted)') : f.target_type === 'suggestion' ? (sugById.get(f.target_id)?.summary ?? 'a suggested edit') : 'a revision',
    targetStatus: f.target_type === 'comment' ? (commentById.get(f.target_id)?.status ?? 'gone') : (sugById.get(f.target_id)?.status ?? 'gone'),
  })) });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['resolve', 'dismiss', 'hide'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: f } = await svc.from('verse_flags').select('id, group_id, target_type, target_id').eq('id', id).maybeSingle();
  const flag = f as { id: number; group_id: number | null; target_type: string; target_id: number } | null;
  if (!flag) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!flag.group_id || !await canCurateSpace(user.id, flag.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (action === 'hide' && flag.target_type === 'comment') {
    await svc.from('verse_discussions').update({ status: 'hidden', updated_at: new Date().toISOString() }).eq('id', flag.target_id);
  }
  await svc.from('verse_flags').update({ status: action === 'dismiss' ? 'dismissed' : 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
