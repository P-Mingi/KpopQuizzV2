// V-ATLAS step 1 - the graph LOADER. Assembles the pure GraphInput from existing
// tables (space entities, eras, wiki pages, the verse_page_links ledger) and
// builds the space graph. No schema: the graph is a view over data already stored.
import { createPublicReadClient } from '@/lib/supabase/server';
import { getEras } from '@/lib/verse/eras';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { ENTITY_TARGET_PREFIX } from '@/lib/verse/pages/links';

import { buildSpaceGraph } from './graph';

import type { Space } from '@/lib/verse/space';
import type { AtlasGraph, GraphInput } from './graph';

/** Map an 'entity:{type}:{slug}' or a wiki slug link target to a graph node key. */
function targetKey(targetSlug: string): string | null {
  if (targetSlug.startsWith(ENTITY_TARGET_PREFIX)) {
    const rest = targetSlug.slice(ENTITY_TARGET_PREFIX.length); // '{type}:{slug}'
    const [type, ...slugParts] = rest.split(':');
    const slug = slugParts.join(':');
    if (!type || !slug) return null;
    const kind = type === 'members' || type === 'idol' ? 'idol' : type === 'albums' || type === 'album' ? 'album' : type;
    return `${kind}:${slug}`;
  }
  return `wiki:${targetSlug}`;
}

export async function getSpaceGraph(space: Space): Promise<AtlasGraph> {
  const groupId = space.group.id;
  const slug = space.group.slug;
  const [eras, wiki] = await Promise.all([getEras(groupId), listPublishedPages(groupId)]);

  const pageSlugById = new Map<number, string>(wiki.map((w) => [w.id, w.slug]));

  // The links ledger -> resolved edges + wanted (not-yet-created) wiki nodes.
  // The ledger keys a source by (source_type, source_id): a wiki page source is
  // source_type='page', source_id=the page id as a string.
  const db = createPublicReadClient();
  // THROW on error (ISR-bake law): getSpaceGraph feeds the mini-map widget on the
  // ISR space home; a swallowed failure would cache an edge-less graph. .order for
  // a deterministic subset if the ledger ever exceeds the 1000-row read cap.
  const { data: linkRows, error: linkErr } = await db.from('verse_page_links').select('source_type, source_id, target_slug, target_page_id').eq('group_id', groupId).eq('source_type', 'page').order('id').limit(4000);
  if (linkErr) throw new Error(`getSpaceGraph(${slug}): links ledger read failed: ${JSON.stringify(linkErr)}`);
  const links: GraphInput['links'] = [];
  const wantedWiki = new Map<string, { slug: string; title: string }>();
  for (const r of (linkRows ?? []) as Array<{ source_type: string; source_id: string; target_slug: string; target_page_id: number | null }>) {
    const srcSlug = pageSlugById.get(Number(r.source_id));
    if (!srcSlug) continue;
    const tk = targetKey(r.target_slug);
    if (!tk) continue;
    links.push({ a: `wiki:${srcSlug}`, b: tk });
    // A wiki target with no resolved page id is a WANTED page (a red link).
    if (tk.startsWith('wiki:') && r.target_page_id == null) {
      const wslug = tk.slice(5);
      if (!wantedWiki.has(wslug)) wantedWiki.set(wslug, { slug: wslug, title: wslug.replace(/-/g, ' ') });
    }
  }

  const input: GraphInput = {
    slug,
    idols: space.idols.map((i) => ({ slug: i.slug, name: i.name })),
    albums: space.albums.map((a) => ({ slug: a.slug, title: a.title })),
    eras: eras.map((e) => ({ slug: e.slug ?? String(e.id), name: e.name, albumSlugs: e.albums.map((al) => al.slug) })),
    wiki: [
      // A PUBLISHED page is a live, crawlable URL, never a red link - even a short
      // (is_stub) one. Only unresolved link targets below are wanted; flagging a
      // published stub wanted would hide it from readers and 409 the create flow.
      ...wiki.map((w) => ({ slug: w.slug, title: w.title, parentSlug: w.parent_page_id != null ? pageSlugById.get(w.parent_page_id) ?? null : null, wanted: false })),
      ...[...wantedWiki.values()].map((w) => ({ slug: w.slug, title: w.title, parentSlug: null, wanted: true })),
    ],
    links,
  };
  return buildSpaceGraph(input);
}
