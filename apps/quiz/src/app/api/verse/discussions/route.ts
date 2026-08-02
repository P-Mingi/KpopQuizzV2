import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getDiscussions, getThreadComments } from '@/lib/verse/discussions';
import { canCurateEntity, resolveEntityGroupId } from '@/lib/verse/curate';
import { checkText, fileFlag, underRateCap, isTrusted, isBlockedInSpace } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// W4.6 - per-page discussion threads. GET is public (visible comments). POST adds a
// comment or a one-level reply (any signed-in user). PATCH hides a comment (its author,
// or a curator of the entity's space).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const u = new URL(req.url);
  const entity_type = u.searchParams.get('entity_type') ?? '';
  const entity_id = u.searchParams.get('entity_id') ?? '';
  const threadId = Number(u.searchParams.get('thread_id')) || 0;
  if (!threadId && (!entity_type || !entity_id)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  const groupId = Number(u.searchParams.get('group_id')) || undefined;
  const comments = threadId ? await getThreadComments(threadId, groupId) : await getDiscussions(entity_type, entity_id, groupId);
  const mark = (c: (typeof comments)[number]): unknown => ({ ...c, mine: !!user && c.authorId === user.id, replies: c.replies.map(mark) });
  return NextResponse.json({ signedIn: !!user, comments: comments.map(mark) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  let entity_type = String(body.entity_type ?? '');
  let entity_id = String(body.entity_id ?? '');
  const text = String(body.body ?? '').trim();
  const parentId = body.parent_id == null ? null : Number(body.parent_id);
  const threadId = body.thread_id == null ? null : Number(body.thread_id);
  if (!text || (!threadId && (!entity_type || !entity_id))) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'too_long' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  // Rate limit: at most 5 comments / minute per user (spam guard).
  if (!await underRateCap('verse_discussions', 'author', user.id, 60, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  // Trust tier: brand-new accounts (< 1 day) can't post links (link-spam guard).
  if (/https?:\/\//i.test(text) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  // Banned-term check: block outright, or allow-but-flag for patrol.
  const hit = await checkText(text);
  if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });

  const svc = createServiceRoleClient();
  // Thread mode: the comment inherits the thread's entity anchor (verse_discussions
  // needs a non-null entity), and carries the thread_id.
  if (threadId) {
    const { data: th } = await svc.from('verse_threads').select('id, group_id, entity_type, entity_id, status').eq('id', threadId).maybeSingle();
    const tr = th as { id: number; group_id: number; entity_type: string | null; entity_id: string | null; status: string } | null;
    if (!tr || tr.status !== 'visible') return NextResponse.json({ error: 'thread_not_found' }, { status: 404 });
    entity_type = tr.entity_type ?? 'group';
    entity_id = tr.entity_id ?? String(tr.group_id);
  }
  // Block state: a member blocked in this space may not post a comment OR a reply.
  const blockGid = await resolveEntityGroupId(entity_type, entity_id);
  if (blockGid && await isBlockedInSpace(user.id, blockGid)) return NextResponse.json({ error: 'blocked' }, { status: 403 });
  // A reply must attach to a real top-level comment in the SAME scope (thread or
  // page), one level only.
  let parent: number | null = null;
  if (parentId) {
    const { data: p } = await svc.from('verse_discussions').select('id, parent_id, entity_type, entity_id, thread_id').eq('id', parentId).maybeSingle();
    const pr = p as { id: number; parent_id: number | null; entity_type: string; entity_id: string; thread_id: number | null } | null;
    const sameScope = threadId ? pr?.thread_id === threadId : (pr?.thread_id == null && pr?.entity_type === entity_type && pr?.entity_id === entity_id);
    if (!pr || pr.parent_id != null || !sameScope) return NextResponse.json({ error: 'bad_parent' }, { status: 400 });
    parent = pr.id;
  }
  const { data, error } = await svc.from('verse_discussions').insert({ entity_type, entity_id, author: user.id, body: text, parent_id: parent, status: 'visible', thread_id: threadId ?? null }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Bump the thread's activity so it sorts to the top of the community list.
  if (threadId) await svc.from('verse_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  // Auto-flag for patrol when a soft-banned term was used (comment still posts).
  if (hit?.action === 'flag') {
    const gid = await resolveEntityGroupId(entity_type, entity_id);
    await fileFlag({ target_type: 'comment', target_id: data.id, group_id: gid, reporter: null, reason: `Auto-flag: term "${hit.term}"` });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: c } = await svc.from('verse_discussions').select('id, author, entity_type, entity_id').eq('id', id).maybeSingle();
  const row = c as { id: number; author: string; entity_type: string; entity_id: string } | null;
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const isOwn = row.author === user.id;
  const canModerate = isOwn || await canCurateEntity(user.id, row.entity_type, row.entity_id);
  if (!canModerate) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  await svc.from('verse_discussions').update({ status: isOwn ? 'deleted' : 'hidden', updated_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
