/**
 * V-ATLAS step 1 proof - the graph SERVICE.
 *   A. Pure fixture: per-kind cap + "+N more" exit, ring budget, wanted-gating,
 *      and two-load DETERMINISM (same input -> byte-identical positions).
 *   B. Real BTS graph: build from live tables, assert a bounded neighbourhood
 *      (never the whole graph), counts sanity, two-load determinism.
 *
 * Run from apps/quiz:  npx tsx scripts/verify-atlas-graph.mts
 * Read-only (no writes, nothing to clean up).
 */
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { buildSpaceGraph, neighborhood } from '../src/lib/verse/atlas/graph.ts';
import { idolSlug, albumSlug } from '../src/lib/verse/slug.ts';

import type { GraphInput } from '../src/lib/verse/atlas/graph.ts';

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

let failed = false;
const ok = (m: string): void => console.log('  ok   ' + m);
const fail = (m: string): void => { console.log('  FAIL ' + m); failed = true; };
const ENTITY_TARGET_PREFIX = 'entity:';

/** Mirror of the loader's target-key resolution (data.ts), inlined so the proof stays standalone. */
function targetKey(targetSlug: string): string | null {
  if (targetSlug.startsWith(ENTITY_TARGET_PREFIX)) {
    const [type, ...rest] = targetSlug.slice(ENTITY_TARGET_PREFIX.length).split(':');
    const slug = rest.join(':');
    if (!type || !slug) return null;
    const kind = type === 'members' || type === 'idol' ? 'idol' : type === 'albums' || type === 'album' ? 'album' : type;
    return `${kind}:${slug}`;
  }
  return `wiki:${targetSlug}`;
}

function fixtureTests(): void {
  console.log('A. pure fixture');
  const input: GraphInput = {
    slug: 'fixture',
    idols: Array.from({ length: 20 }, (_, i) => ({ slug: `m${String(i).padStart(2, '0')}`, name: `Member ${i}` })), // > cap 12
    albums: [{ slug: 'a1', title: 'A1' }, { slug: 'a2', title: 'A2' }, { slug: 'orphan', title: 'Orphan' }],
    eras: [{ slug: 'e1', name: 'Era One', albumSlugs: ['a1', 'a2'] }],
    wiki: [
      { slug: 'lore', title: 'Lore', parentSlug: null, wanted: false },
      { slug: 'sub', title: 'Sub', parentSlug: 'lore', wanted: false },
      { slug: 'ghost', title: 'Ghost', parentSlug: null, wanted: true }, // stub = wanted
    ],
    links: [{ a: 'wiki:lore', b: 'idol:m00' }],
  };
  const g = buildSpaceGraph(input);
  const n = neighborhood(g, 'space:fixture');

  const more = n.nodes.find((x) => x.kind === 'more');
  more && more.label === '+12 more' ? ok(`20 idols -> 8 sampled + "${more.label}" exit (never 20 nodes)`) : fail(`expected a "+12 more" exit, got ${more?.label ?? 'none'}`);
  const idolCount = n.nodes.filter((x) => x.kind === 'idol').length;
  idolCount === 8 ? ok('ring-1 idols capped at 8') : fail(`expected 8 idols, got ${idolCount}`);
  n.nodes.length <= 44 ? ok(`neighbourhood bounded (${n.nodes.length} <= 44 nodes)`) : fail(`neighbourhood too large: ${n.nodes.length}`);
  n.nodes.some((x) => x.key === 'era:e1') ? ok('era present in ring 1') : fail('era missing');
  n.nodes.some((x) => x.key === 'album:orphan') ? ok('era-less album still reachable (hung off the space)') : fail('orphan album lost');

  // Wanted (red-link) gating.
  n.nodes.some((x) => x.wanted) ? fail('a wanted node leaked into the reader neighbourhood') : ok('wanted node hidden by default');
  const withWanted = neighborhood(g, 'space:fixture', { includeWanted: true });
  withWanted.nodes.some((x) => x.key === 'wiki:ghost') ? ok('wanted node appears with includeWanted (build mode)') : fail('wanted node missing in build mode');

  // Determinism: two independent builds + neighbourhoods must be byte-identical.
  const n2 = neighborhood(buildSpaceGraph(input), 'space:fixture');
  JSON.stringify(n.nodes) === JSON.stringify(n2.nodes) ? ok('two loads -> byte-identical positions (deterministic)') : fail('layout not deterministic');
}

async function btsTests(): Promise<void> {
  console.log('B. real BTS graph (group 1)');
  const groupId = 1;
  const slug = 'bts';
  const [idolsR, albumsR, erasR, wikiR, linksR] = await Promise.all([
    db.from('idols').select('name').eq('group_id', groupId).eq('active', true).order('ord'),
    db.from('albums').select('title, era_id').eq('group_id', groupId),
    db.from('eras').select('id, name, slug').eq('group_id', groupId),
    db.from('verse_pages').select('id, slug, title, parent_page_id, is_stub').eq('group_id', groupId).eq('status', 'published'),
    db.from('verse_page_links').select('source_page_id, target_slug, target_page_id').eq('group_id', groupId).limit(4000),
  ]);
  const idols = (idolsR.data ?? []) as Array<{ name: string }>;
  const albumsRaw = (albumsR.data ?? []) as Array<{ title: string; era_id: number | null }>;
  const eras = (erasR.data ?? []) as Array<{ id: number; name: string; slug: string | null }>;
  const wiki = (wikiR.data ?? []) as Array<{ id: number; slug: string; title: string; parent_page_id: number | null; is_stub: boolean }>;
  const linkRows = (linksR.data ?? []) as Array<{ source_page_id: number; target_slug: string; target_page_id: number | null }>;

  const albumSlugByEra = new Map<number, string[]>();
  for (const a of albumsRaw) if (a.era_id != null) { const l = albumSlugByEra.get(a.era_id) ?? []; l.push(albumSlug(a.title)); albumSlugByEra.set(a.era_id, l); }
  const pageSlugById = new Map<number, string>(wiki.map((w) => [w.id, w.slug]));
  const links: GraphInput['links'] = [];
  const wantedWiki = new Map<string, { slug: string; title: string }>();
  for (const r of linkRows) {
    const src = pageSlugById.get(r.source_page_id); if (!src) continue;
    const tk = targetKey(r.target_slug); if (!tk) continue;
    links.push({ a: `wiki:${src}`, b: tk });
    if (tk.startsWith('wiki:') && r.target_page_id == null) { const ws = tk.slice(5); if (!wantedWiki.has(ws)) wantedWiki.set(ws, { slug: ws, title: ws.replace(/-/g, ' ') }); }
  }

  const input: GraphInput = {
    slug,
    idols: idols.map((i) => ({ slug: idolSlug(i.name), name: i.name })),
    albums: albumsRaw.map((a) => ({ slug: albumSlug(a.title), title: a.title })),
    eras: eras.map((e) => ({ slug: e.slug ?? String(e.id), name: e.name, albumSlugs: albumSlugByEra.get(e.id) ?? [] })),
    wiki: [
      ...wiki.map((w) => ({ slug: w.slug, title: w.title, parentSlug: w.parent_page_id != null ? pageSlugById.get(w.parent_page_id) ?? null : null, wanted: w.is_stub })),
      ...[...wantedWiki.values()].map((w) => ({ slug: w.slug, title: w.title, parentSlug: null, wanted: true })),
    ],
    links,
  };

  const g = buildSpaceGraph(input);
  const n = neighborhood(g, `space:${slug}`);
  console.log(`     full graph: ${g.nodes.size} nodes  |  idols ${idols.length}, albums ${albumsRaw.length}, eras ${eras.length}, wiki ${wiki.length}, links ${linkRows.length}, wanted-pages ${wantedWiki.size}`);
  const ringBreak = [0, 1, 2].map((r) => `r${r}:${n.nodes.filter((x) => x.ring === r).length}`).join(' ');
  console.log(`     neighbourhood: ${n.nodes.length} nodes (${ringBreak}), ${n.edges.length} edges  |  counts published ${n.counts.published} / wanted ${n.counts.wanted}`);

  g.nodes.size > idols.length ? ok('graph assembled from live tables') : fail('graph came back empty');
  n.center.key === `space:${slug}` ? ok('centered on the space hub') : fail(`wrong center: ${n.center.key}`);
  n.nodes.length <= 44 && n.nodes.length > 1 ? ok(`neighbourhood bounded (${n.nodes.length} <= 44), never the whole graph`) : fail(`neighbourhood size off: ${n.nodes.length}`);
  n.nodes.every((x) => !x.wanted) ? ok('no wanted node in the reader neighbourhood') : fail('wanted node leaked');
  const n2 = neighborhood(buildSpaceGraph(input), `space:${slug}`);
  JSON.stringify(n.nodes) === JSON.stringify(n2.nodes) ? ok('two loads -> identical positions (stable map every visit)') : fail('BTS layout not deterministic');
}

async function main(): Promise<void> {
  fixtureTests();
  await btsTests();
  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
  process.exit(failed ? 1 : 0);
}
void main();
