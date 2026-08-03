// V-HARMONY-2A step 1 - the unified page shell + its four doors. Every reader
// page renders through ONE shell carrying four MIN-GATED doors (absent when
// empty, never a dead door). The infinite is in the CLICKING: each page renders
// exactly one level of connections; a single render never expands the graph.
//
// SEO invariant (LAW): every door emits the target's REAL <a href> + true title
// in the crawlable HTML. Presentation (the coming doorway registry) changes the
// skin, never the link or the indexable text - so the default rendering here
// already satisfies the invariant.
import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { MoreAboutThis } from '@/components/verse/pages/more-about-this';
import { DoorwayList } from '@/components/verse/pages/doorway-format';

import { getChildren, pageAncestors, whatLinksHere, getSpaceDoorways } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { resolveDoorway, DOORWAY_DEFAULT_HEADING } from '@/lib/verse/presentation/doorways';

import type { WikiPage } from '@/lib/verse/pages/data';

const wikiHref = (groupSlug: string, slug: string): string => `/verse/${groupSlug}/wiki/${slug}`;
const kindLabel = (kind: string): string => getKind(KPOP_PAGE_REGISTRY, kind)?.label ?? kind;

/** DOOR 1 - where it sits. Real-depth breadcrumb (Verse / fandom / ...ancestors /
 * this page) + BreadcrumbList JSON-LD (emitted by the shared, XSS-escaped
 * <Breadcrumbs>). The ancestor walk is cycle- and depth-guarded in pageAncestors. */
export async function BreadcrumbShell({ page, groupSlug, fandomName }: {
  page: WikiPage; groupSlug: string; fandomName: string;
}): Promise<React.ReactElement> {
  const ancestors = await pageAncestors(page);
  const items = [
    { label: 'Verse', href: '/verse' },
    { label: fandomName, href: `/verse/${groupSlug}` },
    ...ancestors.map((a) => ({ label: a.title, href: wikiHref(groupSlug, a.slug) })),
    { label: page.title }, // current page: no href (BreadcrumbList treats it as the leaf)
  ];
  return <Breadcrumbs items={items} />;
}

/** DOOR 2 - pages inside this. The parent_page_id children, FINALLY rendered.
 * ONE level only (getChildren fetches direct children, self-reference skipped);
 * capped with a "see all" link so a page with many children never renders 200
 * inline doors. Min-gated: null when there are no published children. */
export async function PagesInside({ groupId, groupSlug, pageId }: {
  groupId: number; groupSlug: string; pageId: number;
}): Promise<React.ReactElement | null> {
  const { children, total } = await getChildren(groupId, pageId);
  if (children.length === 0) return null;
  const cfg = resolveDoorway(await getSpaceDoorways(groupId), 'pagesInside');
  const items = children.map((c) => ({ href: wikiHref(groupSlug, c.slug), title: c.title, sub: kindLabel(c.kind) }));
  return (
    <DoorwayList
      heading={cfg.label ?? DOORWAY_DEFAULT_HEADING.pagesInside}
      items={items}
      format={cfg.format}
      collapsed={cfg.collapsed ?? false}
      action={total > children.length ? <Link href={`/verse/${groupSlug}/wiki`} className="text-secondary no-underline hover:text-primary">See all {total}</Link> : undefined}
    />
  );
}

/** DOOR 4 - what links here. Pages that point back at this page (the connective
 * footer). whatLinksHere is scoped (target_page_id) and capped at 100, so the
 * 1000-row law holds. Min-gated: null when nothing published links here. */
export async function WhatLinksHere({ groupId, groupSlug, pageId }: {
  groupId: number; groupSlug: string; pageId: number;
}): Promise<React.ReactElement | null> {
  const links = await whatLinksHere(groupId, pageId);
  const pages = links.filter((l): l is { sourceType: string; sourceId: string; page: { slug: string; title: string } } => !!l.page);
  if (pages.length === 0) return null;
  // Self-reference guard: a page that somehow links to itself never lists itself.
  const seen = new Set<string>();
  const unique = pages.filter((l) => l.page.slug !== undefined && !seen.has(l.page.slug) && (seen.add(l.page.slug), true));
  const cfg = resolveDoorway(await getSpaceDoorways(groupId), 'whatLinksHere');
  const items = unique.map((l) => ({ href: wikiHref(groupSlug, l.page.slug), title: l.page.title }));
  return <DoorwayList heading={cfg.label ?? DOORWAY_DEFAULT_HEADING.whatLinksHere} items={items} format={cfg.format} collapsed={cfg.collapsed ?? false} />;
}

/** THE SHELL - composes the four doors around a page's own content, each door
 * min-gated. `entityRef` (when the page connects to an entity) drives DOOR 3
 * (MoreAboutThis). Non-wiki entity pages pass no `page` and use the same doors
 * minus PagesInside (they carry no parent_page_id). */
export async function PageShell({ groupId, groupSlug, fandomName, page, entityRef, entityLabel, children }: {
  groupId: number; groupSlug: string; fandomName: string;
  page: WikiPage;
  entityRef?: string | undefined;
  entityLabel?: string | undefined;
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  return (
    <>
      <div className="mb-4"><BreadcrumbShell page={page} groupSlug={groupSlug} fandomName={fandomName} /></div>
      {children}
      <PagesInside groupId={groupId} groupSlug={groupSlug} pageId={page.id} />
      {entityRef ? <MoreAboutThis groupId={groupId} groupSlug={groupSlug} entityRef={entityRef} entityLabel={entityLabel ?? page.title} /> : null}
      <WhatLinksHere groupId={groupId} groupSlug={groupSlug} pageId={page.id} />
    </>
  );
}

// Re-export so the shell + all four doors import from one module during the
// step-3 convergence of the 42 page files.
export { MoreAboutThis };
