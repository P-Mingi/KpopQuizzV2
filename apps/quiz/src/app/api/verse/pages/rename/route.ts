import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { violatesLivingPersons } from '@/lib/verse/pages/kinds';
import { aliasOpsOnRename } from '@/lib/verse/pages/data';

import type { NextRequest } from 'next/server';

// V-PAGES step 5 - RENAME (curator): executes the requirement-1 rename planner
// verbatim: alias (old -> page id) written so every old URL 301s in one hop,
// any alias at the NEW slug dies, and renaming onto a LIVE slug is rejected
// before any op runs (the unique constraint backstops).
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const pageId = Number(body.page_id);
  const newSlug = String(body.new_slug ?? '').trim();
  if (!pageId || !SLUG_RE.test(newSlug) || newSlug.length > 80) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const hit = violatesLivingPersons(newSlug);
  if (hit) return NextResponse.json({ ok: false, errors: [`The slug touches an excluded topic ("${hit}").`] }, { status: 422 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: pageRow } = await svc.from('verse_pages').select('id, group_id, slug').eq('id', pageId).maybeSingle();
  if (!pageRow) return NextResponse.json({ error: 'No such page' }, { status: 404 });
  const page = pageRow as { id: number; group_id: number; slug: string };
  if (!isAdmin(user.id) && !await canCurateSpace(user.id, page.group_id)) return NextResponse.json({ error: 'Curator role required' }, { status: 403 });
  if (page.slug === newSlug) return NextResponse.json({ ok: true, slug: newSlug });

  // Reject a rename onto a LIVE slug with a clear error, never auto-suffix.
  const { data: taken } = await svc.from('verse_pages').select('id').eq('group_id', page.group_id).eq('slug', newSlug).maybeSingle();
  if (taken) return NextResponse.json({ ok: false, errors: ['A page already lives at that slug.'] }, { status: 409 });

  const oldSlug = page.slug;
  const { error } = await svc.from('verse_pages').update({ slug: newSlug, updated_at: new Date().toISOString() }).eq('id', page.id);
  if (error) return NextResponse.json({ ok: false, errors: [error.code === '23505' ? 'A page already lives at that slug.' : error.message] }, { status: 409 });

  for (const op of aliasOpsOnRename(oldSlug, newSlug)) {
    if (op.op === 'write-alias') {
      await svc.from('verse_page_aliases').upsert({ group_id: page.group_id, old_slug: op.oldSlug, page_id: page.id }, { onConflict: 'group_id,old_slug' });
    } else {
      await svc.from('verse_page_aliases').delete().eq('group_id', page.group_id).eq('old_slug', op.slug);
    }
  }

  return NextResponse.json({ ok: true, slug: newSlug });
}
