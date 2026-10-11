import { NextResponse } from 'next/server';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { isEditorialUser } from '@/lib/editorial/accounts';
import { getEditorialLive } from '@/lib/editorial/live';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { utcDate } from '@/lib/ux-v1/p8/format';
import { canNestUnder, levelOf } from '@/lib/ux-v1/p8/nesting';
import { notifyCommunity } from '@/lib/ux-v1/p8/notify';
import { checkReply, hasLink } from '@/lib/ux-v1/p8/validate';
import { isUxV12 } from '@/lib/ux-v12';
import { checkText, isBlockedInSpace, isTrusted, underRateCap } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/replies { target_type: 'debate'|'challenge'|'editorial'|'daily_debate',
// target_id, body, parent_id?, parent_vote? }: a reply on a fan debate, a challenge, an
// editorial post or (v12) the daily debate (target_id = its day, 'YYYY-MM-DD'; open or
// closed, voted or not: the comment is independent of the vote). Threads and blogs keep
// /api/verse/discussions. Store community_replies (v11-p8-community.sql, widened by
// v12-community-comments.sql): 503 not_live before any write until it exists.
// v12 (owner, 2026-10-06): replies nest like on Reddit: the parent is any visible reply
// of the same post (or, on the daily debate, a vote comment: parent_vote), 10 levels at
// most (lib/ux-v1/p8/nesting.ts). Guards as verse comments: rate cap 5 a minute, new
// accounts post no links, banned terms (lib/verse/moderation).
export const dynamic = 'force-dynamic';

type Svc = ReturnType<typeof createServiceRoleClient>;

/** "voted Agree" for a daily debate comment of a fan who voted that day; else null. */
async function votedMeta(svc: Svc, userId: string, date: string): Promise<string | null> {
  const [{ data: v }, { data: d }] = await Promise.all([
    svc.from('debate_votes').select('side').eq('date', date).eq('user_id', userId).maybeSingle(),
    svc.from('daily_debates').select('question_id').eq('date', date).maybeSingle(),
  ]);
  const side = (v as { side?: string } | null)?.side;
  const qid = (d as { question_id?: string } | null)?.question_id;
  if (!side || !qid) return null;
  const { data: q } = await svc.from('debate_questions').select('side_a, side_b').eq('id', qid).maybeSingle();
  const labels = q as { side_a: string; side_b: string } | null;
  return labels ? `voted ${side === 'a' ? labels.side_a : labels.side_b}` : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const c = checkReply(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
  const r = c.value;
  // The daily debate's own comments are v12 only (v11 keeps the reply that rides with the vote).
  if (r.type === 'daily_debate' && !isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    if (!(await tableLive('community_replies'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  // v12: an editorial (team) account never acts as a fan (SYSTEM.md 5.6).
  if (await isEditorialUser(user.id)) return NextResponse.json({ error: 'editorial_account' }, { status: 403 });

  const svc = createServiceRoleClient();
  let groupId: number | null = null;
  // For the bell (v12): the post's author (fan debate, challenge), its page, and the parent's author.
  let postAuthor: string | null = null;
  let postPath = r.type === 'daily_debate' ? `/community/debate/${r.date}` : `/community/${r.type}/${r.targetId}`;
  let parentAuthor: string | null = null;
  if (r.type === 'daily_debate') {
    // Any published day up to today, open or closed.
    if (!r.date || r.date > utcDate()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const { data: d } = await svc.from('daily_debates').select('date').eq('date', r.date).maybeSingle();
    if (!d) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  } else {
    // v12: a reply on an editorial thread or blog (editorial_posts); not found until that store is live.
    if (r.type === 'editorial' && !(await getEditorialLive())) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const table = r.type === 'debate' ? 'community_debates' : r.type === 'challenge' ? 'community_challenges' : 'editorial_posts';
    const { data: t } = await svc.from(table).select(r.type === 'editorial' ? 'id, group_id, status, kind' : 'id, group_id, status, author').eq('id', r.targetId).maybeSingle();
    const target = t as unknown as { id: number; group_id: number | null; status: string; author?: string | null; kind?: string } | null;
    if (!target || target.status !== 'visible') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    groupId = target.group_id;
    // An editorial post's author is a Team account: never notified (notify.ts).
    if (r.type !== 'editorial') postAuthor = target.author ?? null;
    else postPath = `/community/${target.kind === 'blog' ? 'blog' : 'thread'}/e${r.targetId}`;
  }
  if (groupId !== null && await isBlockedInSpace(user.id, groupId)) return NextResponse.json({ error: 'blocked' }, { status: 403 });

  if (r.parentId !== null || r.parentVote !== null) {
    // The parent belongs to this post and is visible; the new reply stays within 10 levels.
    let level: number | null;
    if (r.parentVote !== null) {
      const { data: v } = await svc.from('debate_votes').select('id, date, comment, comment_hidden_at, user_id').eq('id', r.parentVote).maybeSingle();
      const vote = v as { date: string; comment: string | null; comment_hidden_at: string | null; user_id: string } | null;
      if (!vote || vote.date !== r.date || !vote.comment?.trim() || vote.comment_hidden_at) return NextResponse.json({ error: 'bad_parent' }, { status: 400 });
      level = 1; // a vote comment is a comment on the post
      parentAuthor = vote.user_id;
    } else {
      const rows = await fetchAllRows<{ id: number; parent_id: number | null; parent_vote: string | null; status: string; author: string | null }>(() => svc.from('community_replies')
        .select('id, parent_id, parent_vote, status, author').eq('target_type', r.type).eq('target_id', r.targetId).order('id', { ascending: true }));
      const parent = rows.find((x) => Number(x.id) === r.parentId);
      if (!parent || parent.status !== 'visible') return NextResponse.json({ error: 'bad_parent' }, { status: 400 });
      parentAuthor = parent.author;
      const parentOf = new Map<string, string | null>();
      for (const x of rows) {
        parentOf.set(String(x.id), x.parent_id != null ? String(x.parent_id) : x.parent_vote);
        if (x.parent_vote) parentOf.set(x.parent_vote, null); // the vote comment: a top row
      }
      level = levelOf(String(parent.id), parentOf);
    }
    if (!canNestUnder(level)) return NextResponse.json({ error: 'too_deep' }, { status: 400 });
  }

  if (!await underRateCap('community_replies', 'author', user.id, 60, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  if (hasLink(r.body) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  const hit = await checkText(r.body);
  if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });

  const { data, error } = await svc.from('community_replies')
    .insert({ target_type: r.type, target_id: r.targetId, parent_id: r.parentId, ...(r.parentVote ? { parent_vote: r.parentVote } : {}), author: user.id, body: r.body, status: 'visible' })
    .select('id').single();
  if (error) return NextResponse.json({ error: 'post_failed' }, { status: 500 });
  const id = (data as { id: number }).id;
  // v12 (owner, 2026-10-07): the bell (lib/ux-v1/p8/notify.ts). A reply tells its parent's
  // author (a reply or a vote comment); a comment tells the author of the fan debate or the
  // challenge (the daily debate has none, a Team post's is never told).
  const link = `${postPath}?reply=${id}`;
  if (r.parentVote !== null) await notifyCommunity({ type: 'community_reply', recipient: parentAuthor, actor: user.id, groupKey: `reply:vote:${r.parentVote}`, ref: `reply:${id}`, link, text: r.body });
  else if (r.parentId !== null) await notifyCommunity({ type: 'community_reply', recipient: parentAuthor, actor: user.id, groupKey: `reply:reply:${r.parentId}`, ref: `reply:${id}`, link, text: r.body });
  else if (postAuthor) await notifyCommunity({ type: 'community_comment', recipient: postAuthor, actor: user.id, groupKey: `post:${r.type}:${r.targetId}`, ref: `reply:${id}`, link, text: r.body });
  const meta = r.type === 'daily_debate' && r.date ? await votedMeta(svc, user.id, r.date) : null;
  return NextResponse.json({ ok: true, id, ...(meta ? { meta } : {}) });
}
