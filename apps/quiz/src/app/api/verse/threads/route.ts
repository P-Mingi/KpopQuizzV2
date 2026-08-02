import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkText, fileFlag, underRateCap, isTrusted } from '@/lib/verse/moderation';
import { slugify } from '@/lib/verse/slug';

import type { NextRequest } from 'next/server';

// V-COMM-3 step 2 - start a thread. A titled discussion in a space: creates the
// verse_threads row + its opening comment (a verse_discussions row carrying the
// thread_id). Any signed-in user, behind the SAME moderation as comments
// (rate cap, new-account link guard, banned-term block/flag).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const title = String(body.title ?? '').trim();
  const text = String(body.body ?? '').trim();
  if (!groupId || !title) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  if (title.length > 140 || text.length > 2000) return NextResponse.json({ error: 'too_long' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  if (!await underRateCap('verse_threads', 'created_by', user.id, 300, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const linky = `${title}\n${text}`;
  if (/https?:\/\//i.test(linky) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  // Banned-term check across BOTH the title and the opening post.
  const hit = await checkText(linky);
  if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });

  const svc = createServiceRoleClient();
  const base = slugify(title).slice(0, 50) || 'thread';
  let threadId: number | null = null; let slug = base;
  for (let attempt = 0; attempt < 5 && threadId === null; attempt++) {
    slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await svc.from('verse_threads')
      .insert({ group_id: groupId, slug, title, created_by: user.id, entity_type: 'group', entity_id: String(groupId), status: 'visible' })
      .select('id').single();
    if (!error) { threadId = (data as { id: number }).id; break; }
    if (!String(error.message).includes('duplicate') && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (threadId === null) return NextResponse.json({ error: 'slug_conflict' }, { status: 409 });

  // The opening post (thread_id set; entity anchor mirrors the thread's).
  const { data: c, error: cErr } = await svc.from('verse_discussions')
    .insert({ entity_type: 'group', entity_id: String(groupId), author: user.id, body: text || title, parent_id: null, status: 'visible', thread_id: threadId })
    .select('id').single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  if (hit?.action === 'flag') {
    await fileFlag({ target_type: 'comment', target_id: (c as { id: number }).id, group_id: groupId, reporter: null, reason: `Auto-flag: term "${hit.term}"` });
  }
  return NextResponse.json({ ok: true, id: threadId, slug });
}
