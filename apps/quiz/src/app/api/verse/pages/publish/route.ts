import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { validatePageMeta } from '@/lib/verse/pages/validate';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { extractPageRefs, syncPageLinks, resolveWantedTo } from '@/lib/verse/pages/links';
import { plainTextExcerpt } from '@/lib/verse/render-content';

import type { NextRequest } from 'next/server';

// V-PAGES step 5 - CURATOR REVIEW: publish or return. Publish takes the latest
// body draft, writes verse_content + a verse_revisions row (history first, the
// 127 law), flips status with published_at + is_stub (words < 50 = stub: kept
// out of the sitemap and robots-noindexed), then syncs the link ledger and
// resolves wanted rows. Return sends the page back to draft with a note-free
// status flip (the discussion thread is where feedback lives).
export const dynamic = 'force-dynamic';

const STUB_WORDS = 50;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const pageId = Number(body.page_id);
  const action = String(body.action ?? 'publish');
  if (!pageId || !['publish', 'return'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: pageRow } = await svc.from('verse_pages').select('*').eq('id', pageId).maybeSingle();
  if (!pageRow) return NextResponse.json({ error: 'No such page' }, { status: 404 });
  const page = pageRow as { id: number; group_id: number; kind: string; slug: string; title: string; status: string; infobox: Record<string, unknown>; created_by: string; published_at: string | null };

  if (!isAdmin(user.id) && !await canCurateSpace(user.id, page.group_id)) {
    return NextResponse.json({ error: 'Curator role required' }, { status: 403 });
  }

  if (action === 'return') {
    if (page.status !== 'review') return NextResponse.json({ error: 'Only pages in review can be returned' }, { status: 409 });
    await svc.from('verse_pages').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', page.id);
    return NextResponse.json({ ok: true, status: 'draft' });
  }

  // publish: full gate at the door (status 'published' fires every leave-draft rule)
  const checked = validatePageMeta(KPOP_PAGE_REGISTRY, {
    kind: page.kind, slug: page.slug, title: page.title, status: 'published', infobox: page.infobox,
  });
  if (!checked.ok) return NextResponse.json({ ok: false, errors: checked.errors }, { status: 422 });

  // The body: latest draft for this page (any author), else the existing
  // published body (meta-only republish).
  const { data: draftRow } = await svc.from('verse_drafts')
    .select('content, author, updated_at').eq('entity_type', 'page').eq('entity_id', String(page.id)).eq('section_key', 'body')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const { data: liveRow } = await svc.from('verse_content')
    .select('id, content').eq('entity_type', 'page').eq('entity_id', String(page.id)).eq('section_key', 'body').maybeSingle();
  const doc = (draftRow as { content?: unknown } | null)?.content ?? (liveRow as { content?: unknown } | null)?.content ?? null;
  if (!doc) return NextResponse.json({ ok: false, errors: ['The page has no body text yet.'] }, { status: 422 });
  const author = (draftRow as { author?: string } | null)?.author ?? page.created_by;

  // History first (127 law), then content, then the pointer.
  let contentId = (liveRow as { id?: number } | null)?.id ?? null;
  if (!contentId) {
    const { data: created } = await svc.from('verse_content').insert({
      entity_type: 'page', entity_id: String(page.id), section_key: 'body', content: doc,
    }).select('id').single();
    contentId = (created as { id: number }).id;
  }
  const { data: rev } = await svc.from('verse_revisions').insert({
    content_id: contentId, entity_type: 'page', entity_id: String(page.id), section_key: 'body',
    author, summary: page.published_at ? 'Updated page' : 'Published page', content: doc,
  }).select('id').single();
  await svc.from('verse_content').update({
    content: doc, current_revision_id: (rev as { id: number }).id, updated_at: new Date().toISOString(),
  }).eq('id', contentId);

  const words = plainTextExcerpt(doc, 10000).split(/\s+/).filter(Boolean).length;
  await svc.from('verse_pages').update({
    status: 'published', is_stub: words < STUB_WORDS,
    published_at: page.published_at ?? new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', page.id);

  // The rabbit-hole bookkeeping: this page's outgoing refs + any red links to it.
  await syncPageLinks(svc, { groupId: page.group_id, sourceType: 'page', sourceId: String(page.id), refs: extractPageRefs(doc, await groupSlug(svc, page.group_id)) });
  await resolveWantedTo(svc, page.group_id, page.slug, page.id);

  return NextResponse.json({ ok: true, status: 'published', stub: words < STUB_WORDS });
}

async function groupSlug(svc: ReturnType<typeof createServiceRoleClient>, groupId: number): Promise<string> {
  const { data } = await svc.from('groups').select('slug').eq('id', groupId).maybeSingle();
  return (data as { slug: string } | null)?.slug ?? '';
}
