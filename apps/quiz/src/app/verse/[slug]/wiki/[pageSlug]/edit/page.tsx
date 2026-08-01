import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { currentSpaceRole } from '@/lib/verse/roles';
import { canCurateSpace } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { PageEditor } from '@/components/verse/pages/page-editor';

import type { Metadata } from 'next';
import type { WikiPage } from '@/lib/verse/pages/data';

// V-PAGES step 5 - the editor route. Reads ANY status via the service role, but
// only for the author, a curator, or an admin; everyone else 404s (a draft's
// existence stays invisible). Never indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Edit page', robots: { index: false, follow: false } };

export default async function EditWikiPage({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<React.ReactElement> {
  const { slug, pageSlug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { userId } = await currentSpaceRole(space.group.id);
  if (!userId) notFound();

  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_pages')
    .select('id, group_id, kind, slug, title, parent_page_id, infobox, status, is_stub, created_by, published_at, updated_at')
    .eq('group_id', space.group.id).eq('slug', pageSlug).maybeSingle();
  if (!data) notFound();
  const page = data as WikiPage;

  const curator = await canCurateSpace(userId, space.group.id);
  if (page.created_by !== userId && !curator && !isAdmin(userId)) notFound();

  const def = getKind(KPOP_PAGE_REGISTRY, page.kind);
  if (!def) notFound();

  // The freshest body: the editor's own draft first, then the latest draft by
  // anyone (curator continuing an author's work), then the published body.
  const [{ data: ownDraft }, { data: anyDraft }, { data: live }] = await Promise.all([
    svc.from('verse_drafts').select('content').eq('entity_type', 'page').eq('entity_id', String(page.id)).eq('section_key', 'body').eq('author', userId).maybeSingle(),
    svc.from('verse_drafts').select('content, updated_at').eq('entity_type', 'page').eq('entity_id', String(page.id)).eq('section_key', 'body').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('verse_content').select('content').eq('entity_type', 'page').eq('entity_id', String(page.id)).eq('section_key', 'body').maybeSingle(),
  ]);
  const body = (ownDraft as { content?: unknown } | null)?.content
    ?? (anyDraft as { content?: unknown } | null)?.content
    ?? (live as { content?: unknown } | null)?.content
    ?? null;

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${space.group.slug}` }, { label: 'Atlas', href: `/verse/${space.group.slug}/wiki` }, { label: page.title, href: `/verse/${space.group.slug}/wiki/${page.slug}` }, { label: 'Edit' }]} />
      </div>
      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>Editing · {def.label}</p>
        <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>{page.title}</h1>
      </header>
      <PageEditor
        page={{ id: page.id, group_id: page.group_id, kind: page.kind, slug: page.slug, title: page.title, status: page.status, infobox: page.infobox }}
        def={def} initialBody={body} canPublish={curator || isAdmin(userId)} groupSlug={space.group.slug} />
    </div>
  );
}
