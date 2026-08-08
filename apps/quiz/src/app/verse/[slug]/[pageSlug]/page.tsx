import { notFound, permanentRedirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verseHidden } from '@/lib/verse/visibility';
import { isVersePrivileged } from '@/lib/verse/roles';
import { getPageBySlug, getPageById, resolveRedirect } from '@/lib/verse/tree/data';
import { buildFactRail } from '@/lib/verse/tree/factrail';
import { DocumentPage } from '@/components/verse/tree/document-page';
import { breadcrumbLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';
import type { Crumb, NavboxItem } from '@/components/verse/tree/document-page';
import type { PageRow } from '@/lib/verse/tree/types';

// V-FOUNDATION F1 Phase C - the FLAT document route /verse/<space>/<slug> (C2). The tree
// (breadcrumbs) is logical (parent_id); the URL never moves. ISR/static, safeFetch-shaped.
// SEO: a stub (no substance, no binding) or a hidden-flag space is noindex + absent from
// the sitemap (C5); one H1 (the title); BreadcrumbList JSON-LD; reading order = DOM.
export const revalidate = 3600;

const ORIGIN = 'https://kpopquiz.org';
const abs = (p: string): string => new URL(p, ORIGIN).toString();

// Published pages read through the public-read client (RLS = published only); a curator/
// admin may PREVIEW a draft (service role), but never a trashed page.
async function loadPage(spaceId: number, slug: string): Promise<PageRow | null> {
  const pub = createPublicReadClient();
  const published = await getPageBySlug(pub, spaceId, slug);
  if (published) return published;
  if (await isVersePrivileged()) {
    const draft = await getPageBySlug(createServiceRoleClient(), spaceId, slug);
    if (draft && draft.status !== 'trash') return draft;
  }
  return null;
}

async function ancestors(svc: ReturnType<typeof createServiceRoleClient>, page: PageRow): Promise<PageRow[]> {
  const chain: PageRow[] = [];
  let hop = page.parent_id;
  for (let i = 0; i < 12 && hop != null; i += 1) {
    const parent = await getPageById(svc, hop);
    if (!parent) break;
    chain.unshift(parent);
    hop = parent.parent_id;
  }
  return chain;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Not found', robots: { index: false, follow: false } };
  const page = await loadPage(space.group.id, pageSlug);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  // C5: index only a published, substantial page in a visible space.
  const indexable = !verseHidden() && page.status === 'published' && !page.is_stub;
  return {
    title: `${page.title} · ${space.group.fandom_name}`,
    alternates: { canonical: `/verse/${slug}/${pageSlug}` },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function TreePage({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<React.ReactElement> {
  const { slug, pageSlug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const page = await loadPage(space.group.id, pageSlug);
  if (!page) {
    // C2: an old slug lives forever as a redirect to the page's current slug.
    const to = await resolveRedirect(createServiceRoleClient(), space.group.id, pageSlug);
    if (to && to !== pageSlug) permanentRedirect(`/verse/${slug}/${to}`);
    notFound();
  }
  // C11: the portal page IS the space home; it renders at /verse/<space>, not a sub-URL.
  if (page.type === 'portal') permanentRedirect(`/verse/${slug}`);

  const svc = createServiceRoleClient();
  const now = new Date();
  const [facts, chain, revCount, backlinkCount] = await Promise.all([
    buildFactRail(svc, page, now),
    ancestors(svc, page),
    svc.from('page_revisions').select('id', { count: 'exact', head: true }).eq('page_id', page.id),
    svc.from('page_links').select('id', { count: 'exact', head: true }).eq('to_page_id', page.id),
  ]);

  // hangul beside the title for member pages (from the bound idol).
  let hangul: string | null = null;
  if (page.entity_kind === 'idol' && page.entity_id != null) {
    const { data } = await svc.from('idols').select('name_hangul').eq('id', page.entity_id).maybeSingle();
    hangul = (data as { name_hangul: string | null } | null)?.name_hangul ?? null;
  }

  // Auto-navbox (prototype note 7): for a member page, the group's roster, derived from the
  // DB (never hand-maintained). Only members that already have a page get a link; the rest
  // render as plain text (honest, no dead links). The current member is bold, not a link.
  let navbox: { heading: string; items: NavboxItem[] } | null = null;
  if (page.entity_kind === 'idol' && page.entity_id != null) {
    const { data: roster } = await svc.from('idols').select('id, name').eq('group_id', space.group.id).eq('active', true).order('ord');
    const ids = (roster as { id: number; name: string }[] | null ?? []).map((r) => r.id);
    const { data: memberPages } = await svc.from('pages').select('slug, entity_id').eq('space_id', space.group.id).eq('entity_kind', 'idol').eq('status', 'published').in('entity_id', ids.length ? ids : [-1]);
    const slugByEntity = new Map((memberPages as { slug: string; entity_id: number }[] | null ?? []).map((p) => [p.entity_id, p.slug]));
    const items: NavboxItem[] = (roster as { id: number; name: string }[] | null ?? []).map((r) => {
      const isCurrent = r.id === page.entity_id;
      const pslug = slugByEntity.get(r.id);
      return { label: r.name, href: pslug ? `/verse/${slug}/${pslug}` : '', current: isCurrent };
    }).filter((it) => it.current || it.href) as NavboxItem[];
    if (items.length > 1) navbox = { heading: `${space.group.name} members`, items };
  }

  const crumbs: Crumb[] = [
    { label: space.group.fandom_name, href: `/verse/${slug}` },
    ...chain.map((p) => ({ label: p.title, href: `/verse/${slug}/${p.slug}` })),
    { label: page.title },
  ];

  return (
    <div className="verse-page verse-scope">
      {jsonLdScript(breadcrumbLd(crumbs.map((c) => ({ name: c.label, url: abs(c.href ?? `/verse/${slug}/${pageSlug}`) }))))}
      <DocumentPage
        spaceSlug={slug}
        page={page}
        hangul={hangul}
        crumbs={crumbs}
        facts={facts}
        navbox={navbox}
        backlinks={{ count: backlinkCount.count ?? 0, sample: [] }}
        revisionCount={revCount.count ?? 0}
        updatedAt={page.updated_at}
      />
    </div>
  );
}
