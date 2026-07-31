// V-PAGES public reads. Cookie-free (createPublicReadClient) so wiki pages stay
// ISR-cacheable, and RLS enforces published-only at the database: a draft page
// is invisible to this client even if a query forgot a filter (belt: RLS,
// suspenders: the explicit status filters below).
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';

export interface WikiPage {
  id: number;
  group_id: number;
  kind: string;
  slug: string;
  title: string;
  parent_page_id: number | null;
  infobox: Record<string, unknown>;
  status: string;
  is_stub: boolean;
  created_by: string;
  published_at: string | null;
  updated_at: string;
}

/** The published page at a live slug, or null. */
export const getPublishedPage = cache(async (groupId: number, slug: string): Promise<WikiPage | null> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_pages')
    .select('id, group_id, kind, slug, title, parent_page_id, infobox, status, is_stub, created_by, published_at, updated_at')
    .eq('group_id', groupId).eq('slug', slug).eq('status', 'published').maybeSingle();
  return (data as WikiPage | null) ?? null;
});

/** The alias target slug for an old slug, or null. */
export const resolvePageAlias = cache(async (groupId: number, oldSlug: string): Promise<string | null> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_page_aliases')
    .select('page_id, verse_pages!inner(slug, status)')
    .eq('group_id', groupId).eq('old_slug', oldSlug).maybeSingle();
  const page = (data as { verse_pages: { slug: string; status: string } } | null)?.verse_pages;
  return page && page.status === 'published' ? page.slug : null;
});

/** REQUIREMENT 1 (logged at step 1): the live page always wins; an alias can
 * never shadow a live slug. This pure function IS the resolution order, unit-
 * proven in test-vpages-gates.mts; the route feeds it the two lookups. */
export function resolveWikiSlug<P, A>(live: P | null, alias: A | null): { kind: 'page'; page: P } | { kind: 'redirect'; to: A } | { kind: 'missing' } {
  if (live) return { kind: 'page', page: live };
  if (alias) return { kind: 'redirect', to: alias };
  return { kind: 'missing' };
}

/** Body doc for a published page (the verse_content rails). */
export const getPageBody = cache(async (pageId: number): Promise<unknown | null> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_content')
    .select('content, updated_at')
    .eq('entity_type', 'page').eq('entity_id', String(pageId)).eq('section_key', 'body').maybeSingle();
  return (data as { content: unknown } | null)?.content ?? null;
});

/** "Started by X, maintained by N fans": distinct body-revision authors. */
export const pageAttribution = cache(async (pageId: number): Promise<{ maintainers: number }> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_revisions')
    .select('author')
    .eq('entity_type', 'page').eq('entity_id', String(pageId)).eq('section_key', 'body').limit(500);
  const authors = new Set(((data ?? []) as { author: string }[]).map((r) => r.author));
  return { maintainers: authors.size };
});

/** Published pages of a space (the wiki index + related exits), newest first. */
export const listPublishedPages = cache(async (groupId: number): Promise<WikiPage[]> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_pages')
    .select('id, group_id, kind, slug, title, parent_page_id, infobox, status, is_stub, created_by, published_at, updated_at')
    .eq('group_id', groupId).eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false }).limit(500);
  return (data ?? []) as WikiPage[];
});

/** REQUIREMENT 2 (logged at step 1): every public what-links-here surface
 * filters to PUBLISHED sources. The ledger itself is complete (drafts write
 * rows too); this reader join drops any source page that is not published, so
 * a draft is never inferable from a public surface. Entity sources (group,
 * album, ...) are inherently public and pass through. */
export const whatLinksHere = cache(async (groupId: number, targetPageId: number): Promise<{ sourceType: string; sourceId: string; page?: { slug: string; title: string } }[]> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_page_links')
    .select('source_type, source_id')
    .eq('group_id', groupId).eq('target_page_id', targetPageId).limit(100);
  const rows = (data ?? []) as { source_type: string; source_id: string }[];
  const pageIds = rows.filter((r) => r.source_type === 'page').map((r) => Number(r.source_id)).filter(Number.isFinite);
  const published = new Map<number, { slug: string; title: string }>();
  if (pageIds.length) {
    const { data: pages } = await db.from('verse_pages')
      .select('id, slug, title').in('id', pageIds).eq('status', 'published');
    for (const p of (pages ?? []) as { id: number; slug: string; title: string }[]) published.set(p.id, { slug: p.slug, title: p.title });
  }
  return rows
    .map((r) => {
      if (r.source_type !== 'page') return { sourceType: r.source_type, sourceId: r.source_id };
      const page = published.get(Number(r.source_id));
      return page ? { sourceType: 'page', sourceId: r.source_id, page } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
});

// ---------------------------------------------------------------------------
// REQUIREMENT 1 planners (unit-proven): the exact alias operations a create or
// rename performs, in order. The API routes execute these verbatim, so the
// collision rules are code, not convention.
//   - create at slug S: the new live page claims the URL; any alias at S dies.
//   - rename A -> B: alias (A -> page id) is written so old URLs 301 in one hop
//     (id-anchored: existing aliases of the page keep pointing at the id, so
//     chains never form); any alias at B dies (nothing may shadow the new live
//     slug). Renaming ONTO a live slug is rejected before any op runs (the
//     unique constraint backstops).
// ---------------------------------------------------------------------------

export type AliasOp =
  | { op: 'delete-alias-at'; slug: string }
  | { op: 'write-alias'; oldSlug: string };

export function aliasOpsOnCreate(slug: string): AliasOp[] {
  return [{ op: 'delete-alias-at', slug }];
}

export function aliasOpsOnRename(oldSlug: string, newSlug: string): AliasOp[] {
  return [
    { op: 'write-alias', oldSlug },
    { op: 'delete-alias-at', slug: newSlug },
  ];
}

/** Parent chain for breadcrumbs (published ancestors only, cycle-guarded). */
export const pageAncestors = cache(async (page: WikiPage): Promise<WikiPage[]> => {
  const db = createPublicReadClient();
  const chain: WikiPage[] = [];
  let currentParent = page.parent_page_id;
  const seen = new Set<number>([page.id]);
  while (currentParent && !seen.has(currentParent) && chain.length < 5) {
    seen.add(currentParent);
    const { data } = await db.from('verse_pages')
      .select('id, group_id, kind, slug, title, parent_page_id, infobox, status, is_stub, created_by, published_at, updated_at')
      .eq('id', currentParent).eq('status', 'published').maybeSingle();
    if (!data) break;
    const p = data as WikiPage;
    chain.unshift(p);
    currentParent = p.parent_page_id;
  }
  return chain;
});
