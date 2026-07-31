// V-PAGES step 4 - the rabbit-hole ledger (verse_page_links). One row per
// internal reference found in saved content:
//   - wiki targets:   target_slug = the page slug, target_page_id = resolved id
//     (NULL until the page exists: the WANTED/red-link state)
//   - entity targets: target_slug = 'entity:{type}:{slug}' with target_page_id
//     always NULL. These power the "More about this" zones on entity pages and
//     are NEVER wanted pages (isWantedTarget excludes the prefix; the 140
//     partial index still serves, the query refines).
// REQUIREMENT 2 (logged at step 1) is enforced at every public read here:
// wanted counts and attached-page lists join source pages and drop anything
// not published, so a draft is never inferable from a public surface.

import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { SupabaseClient } from '@supabase/supabase-js';

export const ENTITY_TARGET_PREFIX = 'entity:';

export interface WikiRef { kind: 'wiki'; slug: string }
export interface EntityRef { kind: 'entity'; ref: string } // 'album:map-of-the-soul-7', 'idol:jimin'
export type PageRef = WikiRef | EntityRef;

const ENTITY_PATHS: Record<string, string> = { albums: 'album', members: 'idol', tours: 'tour', shows: 'show', ost: 'ost' };

/** Pull every internal reference out of a TipTap doc: mention chips (the picker
 * stores the Verse URL in attrs.id) and plain link marks. Only hrefs inside THIS
 * group's space count; external and cross-space links are not ledger material. */
export function extractPageRefs(doc: unknown, groupSlug: string): PageRef[] {
  const found = new Map<string, PageRef>();
  const wiki = new RegExp(`^/verse/${groupSlug}/wiki/([a-z0-9-]+)$`);
  const entity = new RegExp(`^/verse/${groupSlug}/(albums|members|tours|shows|ost)/([a-z0-9-]+)$`);
  const visit = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const node = n as { type?: string; attrs?: { id?: unknown }; marks?: { type?: string; attrs?: { href?: unknown } }[]; content?: unknown[] };
    const hrefs: string[] = [];
    if (node.type === 'mention' && typeof node.attrs?.id === 'string') hrefs.push(node.attrs.id);
    for (const m of node.marks ?? []) if (m.type === 'link' && typeof m.attrs?.href === 'string') hrefs.push(m.attrs.href);
    for (const href of hrefs) {
      const w = href.match(wiki);
      if (w) { found.set(`w:${w[1]}`, { kind: 'wiki', slug: w[1]! }); continue; }
      const e = href.match(entity);
      if (e) found.set(`e:${e[1]}:${e[2]}`, { kind: 'entity', ref: `${ENTITY_PATHS[e[1]!]}:${e[2]}` });
    }
    for (const c of node.content ?? []) visit(c);
  };
  visit(doc);
  return [...found.values()];
}

/** A ledger row's target key. */
export function targetSlugFor(ref: PageRef): string {
  return ref.kind === 'wiki' ? ref.slug : `${ENTITY_TARGET_PREFIX}${ref.ref}`;
}

/** Wanted = an unresolved WIKI target. Entity targets are never wanted. */
export function isWantedTarget(row: { target_slug: string; target_page_id: number | null }): boolean {
  return row.target_page_id === null && !row.target_slug.startsWith(ENTITY_TARGET_PREFIX);
}

/** Pure diff for a source's ledger rows: what to insert, what to delete. */
export function diffLinkSets(existing: string[], next: string[]): { insert: string[]; remove: string[] } {
  const have = new Set(existing);
  const want = new Set(next);
  return {
    insert: [...want].filter((t) => !have.has(t)),
    remove: [...have].filter((t) => !want.has(t)),
  };
}

/** Sync one source's ledger rows to the refs found in its saved content.
 * Service-role only (called from the save/publish APIs). The ledger is COMPLETE
 * (drafts write too); public reads filter, writes never do. */
export async function syncPageLinks(svc: SupabaseClient, input: {
  groupId: number; sourceType: string; sourceId: string; refs: PageRef[];
}): Promise<void> {
  const { groupId, sourceType, sourceId, refs } = input;
  const wikiSlugs = refs.filter((r): r is WikiRef => r.kind === 'wiki').map((r) => r.slug);
  const idBySlug = new Map<string, number>();
  if (wikiSlugs.length) {
    const { data } = await svc.from('verse_pages').select('id, slug').eq('group_id', groupId).in('slug', wikiSlugs);
    for (const p of (data ?? []) as { id: number; slug: string }[]) idBySlug.set(p.slug, p.id);
  }
  const nextRows = refs.map((r) => ({
    target_slug: targetSlugFor(r),
    target_page_id: r.kind === 'wiki' ? (idBySlug.get(r.slug) ?? null) : null,
  }));
  const { data: existing } = await svc.from('verse_page_links')
    .select('id, target_slug').eq('group_id', groupId).eq('source_type', sourceType).eq('source_id', sourceId);
  const rows = (existing ?? []) as { id: number; target_slug: string }[];
  const { insert, remove } = diffLinkSets(rows.map((r) => r.target_slug), nextRows.map((r) => r.target_slug));
  if (remove.length) {
    const ids = rows.filter((r) => remove.includes(r.target_slug)).map((r) => r.id);
    await svc.from('verse_page_links').delete().in('id', ids);
  }
  if (insert.length) {
    const byTarget = new Map(nextRows.map((r) => [r.target_slug, r]));
    await svc.from('verse_page_links').insert(insert.map((t) => ({
      group_id: groupId, source_type: sourceType, source_id: sourceId,
      target_slug: t, target_page_id: byTarget.get(t)?.target_page_id ?? null,
    })));
  }
}

/** When a page is created (or renamed onto a slug), wanted rows resolve to it:
 * every red link across the space turns live in one update. */
export async function resolveWantedTo(svc: SupabaseClient, groupId: number, slug: string, pageId: number): Promise<void> {
  await svc.from('verse_page_links').update({ target_page_id: pageId })
    .eq('group_id', groupId).eq('target_slug', slug).is('target_page_id', null);
}

/** PUBLIC wanted-pages surface: unresolved wiki targets, counted over PUBLISHED
 * sources only (requirement 2: a slug wanted only by drafts stays invisible). */
export const wantedPages = cache(async (groupId: number): Promise<{ slug: string; mentions: number }[]> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_page_links')
    .select('target_slug, target_page_id, source_type, source_id')
    .eq('group_id', groupId).is('target_page_id', null).limit(300);
  const rows = ((data ?? []) as { target_slug: string; target_page_id: number | null; source_type: string; source_id: string }[])
    .filter((r) => isWantedTarget(r));
  const pageIds = [...new Set(rows.filter((r) => r.source_type === 'page').map((r) => Number(r.source_id)))].filter(Number.isFinite);
  const published = new Set<number>();
  if (pageIds.length) {
    const { data: pages } = await db.from('verse_pages').select('id').in('id', pageIds).eq('status', 'published');
    for (const p of (pages ?? []) as { id: number }[]) published.add(p.id);
  }
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.source_type === 'page' && !published.has(Number(r.source_id))) continue;
    counts.set(r.target_slug, (counts.get(r.target_slug) ?? 0) + 1);
  }
  return [...counts.entries()].map(([slug, mentions]) => ({ slug, mentions })).sort((a, b) => b.mentions - a.mentions).slice(0, 20);
});

/** PUBLIC "More about this" zone: published pages whose body references the
 * entity ('album:slug', 'idol:slug', ...). */
export const attachedPages = cache(async (groupId: number, entityRef: string): Promise<{ slug: string; title: string; kind: string }[]> => {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_page_links')
    .select('source_type, source_id')
    .eq('group_id', groupId).eq('target_slug', `${ENTITY_TARGET_PREFIX}${entityRef}`).limit(100);
  const ids = [...new Set(((data ?? []) as { source_type: string; source_id: string }[])
    .filter((r) => r.source_type === 'page').map((r) => Number(r.source_id)))].filter(Number.isFinite);
  if (!ids.length) return [];
  const { data: pages } = await db.from('verse_pages')
    .select('slug, title, kind').in('id', ids).eq('status', 'published').limit(8);
  return (pages ?? []) as { slug: string; title: string; kind: string }[];
});
