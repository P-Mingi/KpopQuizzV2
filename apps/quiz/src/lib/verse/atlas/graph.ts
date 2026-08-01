// V-ATLAS step 1 - THE GRAPH SERVICE. The whole fandom IS the wiki: every page is
// a node of one graph, edges are entity relations + the links ledger. This module
// derives that graph from existing tables (no schema) and computes a NEIGHBORHOOD
// (never the whole graph): the hub, its children, one ring of context, capped and
// SAMPLED so a dense hub never renders hundreds of nodes. Positions are
// deterministic (pure function of sorted keys) so the same map appears every visit.
//
// buildSpaceGraph + neighborhood are PURE (unit-testable on a fixture);
// getSpaceGraph is the loader.

export type AtlasNodeKind = 'space' | 'idol' | 'album' | 'era' | 'wiki' | 'more';
export interface AtlasNode { key: string; kind: AtlasNodeKind; label: string; href: string; hub: boolean; wanted: boolean }
export interface AtlasEdge { a: string; b: string }
export interface AtlasGraph { nodes: Map<string, AtlasNode>; adj: Map<string, Set<string>> }
export interface PositionedNode extends AtlasNode { x: number; y: number; ring: number }
export interface Neighborhood {
  center: AtlasNode;
  nodes: PositionedNode[];
  edges: AtlasEdge[];
  counts: { published: number; wanted: number };
}

export interface GraphInput {
  slug: string;
  idols: Array<{ slug: string; name: string }>;
  albums: Array<{ slug: string; title: string }>;
  eras: Array<{ slug: string; name: string; albumSlugs: string[] }>;
  wiki: Array<{ slug: string; title: string; parentSlug: string | null; wanted: boolean }>;
  links: Array<{ a: string; b: string }>; // already resolved to node keys
}

const NEIGHBOURHOOD_CAP = 44;   // hub + up to ~43 around it
const PER_KIND_RING1_CAP = 12;  // sample beyond this, add a "+N more" exit

export function nodeHref(slug: string, kind: AtlasNodeKind, key: string): string {
  const id = key.slice(key.indexOf(':') + 1);
  switch (kind) {
    case 'space': return `/verse/${slug}`;
    case 'idol': return `/verse/${slug}/members/${id}`;
    case 'album': return `/verse/${slug}/albums/${id}`;
    case 'era': return `/verse/${slug}/timeline`;
    case 'wiki': return `/verse/${slug}/wiki/${id}`;
    case 'more': return `/verse/${slug}/${id}`;
    default: return `/verse/${slug}`;
  }
}

export function buildSpaceGraph(input: GraphInput): AtlasGraph {
  const nodes = new Map<string, AtlasNode>();
  const adj = new Map<string, Set<string>>();
  const add = (n: AtlasNode): void => { if (!nodes.has(n.key)) { nodes.set(n.key, n); adj.set(n.key, new Set()); } };
  const link = (a: string, b: string): void => { if (a === b || !nodes.has(a) || !nodes.has(b)) return; adj.get(a)!.add(b); adj.get(b)!.add(a); };

  const spaceKey = `space:${input.slug}`;
  add({ key: spaceKey, kind: 'space', label: input.slug.toUpperCase(), href: nodeHref(input.slug, 'space', spaceKey), hub: true, wanted: false });

  for (const i of input.idols) { const k = `idol:${i.slug}`; add({ key: k, kind: 'idol', label: i.name, href: nodeHref(input.slug, 'idol', k), hub: false, wanted: false }); link(spaceKey, k); }
  for (const a of input.albums) { const k = `album:${a.slug}`; add({ key: k, kind: 'album', label: a.title, href: nodeHref(input.slug, 'album', k), hub: true, wanted: false }); }
  for (const e of input.eras) {
    const k = `era:${e.slug}`;
    add({ key: k, kind: 'era', label: e.name, href: nodeHref(input.slug, 'era', k), hub: true, wanted: false });
    link(spaceKey, k);
    for (const as of e.albumSlugs) link(k, `album:${as}`);
  }
  // Albums with no era hang directly off the space so nothing is orphaned.
  for (const a of input.albums) { const k = `album:${a.slug}`; if (adj.get(k)!.size === 0) link(spaceKey, k); }
  for (const w of input.wiki) { const k = `wiki:${w.slug}`; add({ key: k, kind: 'wiki', label: w.title, href: nodeHref(input.slug, 'wiki', k), hub: true, wanted: w.wanted }); }
  for (const w of input.wiki) { const k = `wiki:${w.slug}`; link(w.parentSlug ? `wiki:${w.parentSlug}` : spaceKey, k); }
  for (const e of input.links) link(e.a, e.b);

  return { nodes, adj };
}

/** Deterministic radial neighbourhood around a hub. Same input -> same positions. */
export function neighborhood(graph: AtlasGraph, hubKey: string, opts?: { includeWanted?: boolean }): Neighborhood {
  const includeWanted = opts?.includeWanted ?? false;
  const center = graph.nodes.get(hubKey) ?? [...graph.nodes.values()][0]!;
  const visible = (k: string): boolean => { const n = graph.nodes.get(k); return !!n && (includeWanted || !n.wanted); };

  // Ring 1: the hub's direct neighbours, deterministically sorted, per-kind capped.
  const ring1Raw = [...(graph.adj.get(center.key) ?? [])].filter(visible).sort();
  const byKind = new Map<AtlasNodeKind, string[]>();
  for (const k of ring1Raw) { const kind = graph.nodes.get(k)!.kind; (byKind.get(kind) ?? byKind.set(kind, []).get(kind)!).push(k); }
  const ring1: string[] = [];
  const moreNodes: AtlasNode[] = [];
  const slug = center.key.startsWith('space:') ? center.key.slice(6) : '';
  for (const [kind, keys] of [...byKind.entries()].sort()) {
    if (keys.length > PER_KIND_RING1_CAP) {
      ring1.push(...keys.slice(0, PER_KIND_RING1_CAP));
      const cat = kind === 'idol' ? 'members' : kind === 'album' ? 'discography' : kind === 'era' ? 'timeline' : 'wiki';
      moreNodes.push({ key: `more:${cat}:${kind}`, kind: 'more', label: `+${keys.length - PER_KIND_RING1_CAP} more`, href: `/verse/${slug || 'x'}/${cat}`, hub: false, wanted: false });
    } else ring1.push(...keys);
  }

  // Ring 2: one ring of context, capped to fit the neighbourhood budget.
  const inRing1 = new Set(ring1);
  const ring2set = new Set<string>();
  for (const k of ring1) for (const nb of graph.adj.get(k) ?? []) if (nb !== center.key && !inRing1.has(nb) && visible(nb)) ring2set.add(nb);
  const budget = Math.max(0, NEIGHBOURHOOD_CAP - 1 - ring1.length - moreNodes.length);
  const ring2 = [...ring2set].sort().slice(0, budget);

  // Deterministic radial layout. Center at origin; rings on fixed radii; angles
  // evenly spaced by sorted order so the map is learnable and stable.
  const positioned: PositionedNode[] = [{ ...center, x: 0, y: 0, ring: 0 }];
  const place = (keys: string[], radius: number, ring: number, phase: number): void => {
    const extras = ring === 1 ? moreNodes : [];
    const all = [...keys.map((k) => graph.nodes.get(k)!), ...extras];
    all.forEach((n, i) => {
      const ang = phase + (i / Math.max(1, all.length)) * Math.PI * 2;
      positioned.push({ ...n, x: Math.round(Math.cos(ang) * radius), y: Math.round(Math.sin(ang) * radius), ring });
    });
  };
  place(ring1, 100, 1, -Math.PI / 2);
  place(ring2, 190, 2, -Math.PI / 2 + Math.PI / Math.max(1, ring2.length));

  // Edges among the positioned set only.
  const present = new Set(positioned.map((n) => n.key));
  const edges: AtlasEdge[] = [];
  const seen = new Set<string>();
  for (const n of positioned) for (const nb of graph.adj.get(n.key) ?? []) {
    if (!present.has(nb)) continue;
    const id = n.key < nb ? `${n.key}|${nb}` : `${nb}|${n.key}`;
    if (seen.has(id)) continue; seen.add(id);
    edges.push({ a: n.key, b: nb });
  }
  // "more" nodes connect to the center visually.
  for (const m of moreNodes) if (present.has(m.key)) edges.push({ a: center.key, b: m.key });

  const published = [...graph.nodes.values()].filter((n) => !n.wanted).length;
  const wanted = [...graph.nodes.values()].filter((n) => n.wanted).length;
  return { center, nodes: positioned, edges, counts: { published, wanted } };
}
