import { notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace, isVerseAdmin } from '@/lib/verse/roles';
import { verseHidden, spaceUnpublished } from '@/lib/verse/visibility';
import { getSpace } from '@/lib/verse/space';
import { getPageBySlug } from '@/lib/verse/tree/data';
import { PageEditor } from '@/components/verse/tree/page-editor';

import type { Metadata } from 'next';

// V-FOUNDATION F2 Phase 3 - the page editor host. Curator+ writes (admin-locked while
// hidden). noindex. The editor edits pages.blocks through the F1 CRUD save rail.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit page', robots: { index: false, follow: false } };

interface EB { id: string; type: string; level?: 2 | 3; content?: unknown; items?: unknown; cite?: string; icon?: string; path?: string; alt?: string; caption?: string; rows?: unknown; to_slug?: string; label?: string }

export default async function EditPage({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<React.ReactElement> {
  const { slug, pageSlug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) notFound();
  if ((verseHidden() || spaceUnpublished(slug)) && !(await isVerseAdmin())) notFound();
  if (!(await canCurateSpace(user.id, space.group.id))) notFound();

  const svc = createServiceRoleClient();
  const page = await getPageBySlug(svc, space.group.id, pageSlug);
  if (!page || page.type === 'portal') notFound();

  // Map the stored blocks to the editor shape (legacy `text` headings -> a single run).
  const raw = (page.blocks?.blocks ?? []) as Record<string, unknown>[];
  const initialBlocks: EB[] = raw.map((b) => {
    const content = Array.isArray(b.content) ? b.content : (typeof b.text === 'string' && b.text.trim() ? [{ text: b.text }] : []);
    return { id: String(b.id), type: String(b.type), ...(b.level === 3 ? { level: 3 } : b.type === 'heading' ? { level: 2 } : {}),
      ...(content.length || ['paragraph', 'heading', 'quote', 'callout'].includes(String(b.type)) ? { content } : {}),
      ...(Array.isArray(b.items) ? { items: b.items } : {}), ...(typeof b.cite === 'string' ? { cite: b.cite } : {}),
      ...(typeof b.icon === 'string' ? { icon: b.icon } : {}), ...(typeof b.path === 'string' ? { path: b.path } : {}),
      ...(typeof b.alt === 'string' ? { alt: b.alt } : {}), ...(typeof b.caption === 'string' ? { caption: b.caption } : {}),
      ...(Array.isArray(b.rows) ? { rows: b.rows } : {}), ...(typeof b.to_slug === 'string' ? { to_slug: b.to_slug } : {}),
      ...(typeof b.label === 'string' ? { label: b.label } : {}) } as EB;
  });

  return (
    <div className="verse-page verse-scope ped-wrap">
      <div className="ped-head">
        <span className="ped-crumb">{space.group.fandom_name} / {page.title}</span>
        <span className="ped-lockchip">{'\u{1F512}'} Verse locked · admin only</span>
        <span className={`ped-status ${page.status}`}>{page.status}</span>
      </div>
      <h1 className="ped-title">{page.title}</h1>
      <div className="ped-slugline"><span>{'\u{1F512}'}</span> /verse/{slug}/{page.slug} <span className="hint">· renaming the title never changes the URL</span></div>
      {/* PageEditor is a client island; the frame (TOC / meter / history / editable rail /
          publish) lands in Phase 4 and will wrap this. */}
      <PageEditor groupId={space.group.id} pageId={page.id} initialBlocks={initialBlocks as never} />
    </div>
  );
}
