// V-FOUNDATION F1 Phase D - LINKS AS FIRST-CLASS OBJECTS (C6). Internal links are stored
// relationally on every save (page_links), which buys backlinks ("what links here"),
// auto-navboxes that never drift, orphan detection, and GHOST LINKS: a link to a
// not-yet-existing page (to_page_id NULL) renders dashed with a "create this page" CTA -
// fandom's red-link engine, the single biggest page-creation driver, done honestly.
// Wanted-pages = ghost links aggregated by demand.

import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { isValidSlug } from './slug';
import type { PageBody, PageRow } from './types';

export interface PageLinkRef { toSlug: string; label: string }

/** Internal links a body declares. v1: block-level `link` blocks { type:'link', to_slug,
 * label }. (Inline links inside prose arrive with the rich-text wave; the ledger below is
 * already link-shape agnostic.) Deduped by target slug; invalid slugs dropped. */
export function extractLinks(body: PageBody | null | undefined): PageLinkRef[] {
  const seen = new Set<string>();
  const out: PageLinkRef[] = [];
  const add = (toSlug: string, label: string): void => {
    const s = toSlug.trim();
    if (!s || !isValidSlug(s) || seen.has(s)) return;
    seen.add(s); out.push({ toSlug: s, label: label.trim() || s });
  };
  // inline [[ page links live inside a block's runs (content / list items); block-level
  // `link` blocks carry to_slug directly. Both feed page_links (backlinks + wanted).
  const scanRuns = (runs: unknown): void => {
    if (!Array.isArray(runs)) return;
    for (const r of runs as { text?: unknown; link?: { toSlug?: unknown } }[]) {
      const to = r?.link?.toSlug;
      if (typeof to === 'string') add(to, typeof r.text === 'string' ? r.text : to);
    }
  };
  for (const b of body?.blocks ?? []) {
    const rec = b as Record<string, unknown>;
    if (b.type === 'link' && typeof b.to_slug === 'string') { add(b.to_slug, typeof b.label === 'string' ? b.label : b.to_slug); continue; }
    if (Array.isArray(rec.content)) scanRuns(rec.content);
    if (Array.isArray(rec.items)) for (const it of rec.items as unknown[]) scanRuns(it);
  }
  return out;
}

/** Rewrite page_links for one page from its body (idempotent). A target that exists
 * resolves to its id; a missing target is a GHOST (to_page_id NULL) and surfaces in the
 * wanted-pages list until the page is created. */
export async function syncPageLinks(svc: SupabaseClient, page: PageRow): Promise<void> {
  const refs = extractLinks(page.blocks);
  await svc.from('page_links').delete().eq('from_page_id', page.id);
  if (refs.length === 0) return;
  // resolve targets in one query (published or draft, never trashed).
  const slugs = refs.map((r) => r.toSlug);
  const { data: targets } = await svc.from('pages').select('id, slug').eq('space_id', page.space_id).neq('status', 'trash').in('slug', slugs);
  const idBySlug = new Map((targets as { id: number; slug: string }[] | null ?? []).map((t) => [t.slug, t.id]));
  const rows = refs.map((r) => ({
    space_id: page.space_id, from_page_id: page.id,
    to_page_id: idBySlug.get(r.toSlug) ?? null, to_slug: r.toSlug,
  }));
  await svc.from('page_links').upsert(rows, { onConflict: 'from_page_id,to_slug' });
}

/** When a page is created or its slug changes, any ghost link that was waiting for that
 * slug now resolves to it (the red link goes blue). */
export async function resolveGhostsTo(svc: SupabaseClient, page: PageRow): Promise<void> {
  await svc.from('page_links').update({ to_page_id: page.id })
    .eq('space_id', page.space_id).eq('to_slug', page.slug).is('to_page_id', null);
}

/** What links here: PUBLISHED pages linking to `pageId` (a draft linker is not a public
 * backlink, so it counts in neither the number nor the sample). Count + a small sample. */
export async function backlinksFor(svc: SupabaseClient, pageId: number, sampleSize = 5): Promise<{ count: number; sample: { slug: string; title: string }[] }> {
  const { data: links } = await svc.from('page_links').select('from_page_id').eq('to_page_id', pageId).limit(500);
  const fromIds = [...new Set((links as { from_page_id: number }[] | null ?? []).map((l) => l.from_page_id))];
  if (fromIds.length === 0) return { count: 0, sample: [] };
  const { data: pages, count } = await svc.from('pages')
    .select('slug, title', { count: 'exact' }).eq('status', 'published').in('id', fromIds);
  const published = (pages as { slug: string; title: string }[] | null) ?? [];
  return { count: count ?? published.length, sample: published.slice(0, sampleSize) };
}

/** Wanted pages: ghost-link targets aggregated by DEMAND (how many pages want them).
 * Aggregated in JS past the 1000-row cap (fetchAllRows). */
export async function wantedPages(svc: SupabaseClient, spaceId: number, limit = 50): Promise<{ toSlug: string; demand: number }[]> {
  const rows = await fetchAllRows<{ to_slug: string }>(
    () => svc.from('page_links').select('to_slug').eq('space_id', spaceId).is('to_page_id', null),
  );
  const bySlug = new Map<string, number>();
  for (const r of rows) bySlug.set(r.to_slug, (bySlug.get(r.to_slug) ?? 0) + 1);
  return [...bySlug.entries()].map(([toSlug, demand]) => ({ toSlug, demand }))
    .sort((a, b) => b.demand - a.demand).slice(0, limit);
}

/** Orphans: published, non-portal pages that nothing links to (a curation surface). */
export async function orphanPages(svc: SupabaseClient, spaceId: number, limit = 100): Promise<{ id: number; slug: string; title: string }[]> {
  const pages = await fetchAllRows<{ id: number; slug: string; title: string; type: string }>(
    () => svc.from('pages').select('id, slug, title, type').eq('space_id', spaceId).eq('status', 'published').neq('type', 'portal'),
  );
  const linked = await fetchAllRows<{ to_page_id: number | null }>(
    () => svc.from('page_links').select('to_page_id').eq('space_id', spaceId).not('to_page_id', 'is', null),
  );
  const hasInbound = new Set(linked.map((l) => l.to_page_id));
  return pages.filter((p) => !hasInbound.has(p.id)).slice(0, limit).map(({ id, slug, title }) => ({ id, slug, title }));
}
