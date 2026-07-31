import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { validatePageMeta } from '@/lib/verse/pages/validate';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { checkText } from '@/lib/verse/moderation';
import { plainTextExcerpt } from '@/lib/verse/render-content';

import type { NextRequest } from 'next/server';
import type { PageStatus } from '@/lib/verse/pages/validate';

// V-PAGES step 5 - SAVE (author or curator): meta (title/infobox) updates on
// verse_pages + body autosave on the verse_drafts rails (author-keyed; the 127
// autosave law). Banned-terms patrol runs on the body text; the living-persons
// and fact gates run on the meta at every save.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const pageId = Number(body.page_id);
  if (!pageId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: pageRow } = await svc.from('verse_pages').select('id, group_id, kind, slug, title, status, infobox, created_by').eq('id', pageId).maybeSingle();
  if (!pageRow) return NextResponse.json({ error: 'No such page' }, { status: 404 });
  const page = pageRow as { id: number; group_id: number; kind: string; slug: string; title: string; status: string; infobox: Record<string, unknown>; created_by: string };

  const isAuthor = page.created_by === user.id;
  const isCurator = await canCurateSpace(user.id, page.group_id);
  if (!isAuthor && !isCurator && !isAdmin(user.id)) return NextResponse.json({ error: 'Not your page' }, { status: 403 });

  // Meta save (title/infobox); status unchanged here.
  if (body.title !== undefined || body.infobox !== undefined) {
    const checked = validatePageMeta(KPOP_PAGE_REGISTRY, {
      kind: page.kind, slug: page.slug,
      title: body.title !== undefined ? String(body.title) : page.title,
      status: page.status as PageStatus,
      infobox: body.infobox !== undefined ? body.infobox : page.infobox,
    });
    if (!checked.ok || !checked.value) return NextResponse.json({ ok: false, errors: checked.errors }, { status: 422 });
    await svc.from('verse_pages').update({
      title: checked.value.title, infobox: checked.value.infobox, updated_at: new Date().toISOString(),
    }).eq('id', page.id);
  }

  // Body autosave (verse_drafts, author-keyed).
  if (body.body !== undefined) {
    const doc = body.body;
    const text = plainTextExcerpt(doc, 4000);
    const hit = await checkText(text);
    if (hit?.action === 'block') return NextResponse.json({ ok: false, errors: [`That text contains a blocked term ("${hit.term}").`] }, { status: 422 });
    await svc.from('verse_drafts').upsert({
      entity_type: 'page', entity_id: String(page.id), section_key: 'body',
      author: user.id, content: doc, updated_at: new Date().toISOString(),
    }, { onConflict: 'author,entity_type,entity_id,section_key' });
  }

  return NextResponse.json({ ok: true });
}
