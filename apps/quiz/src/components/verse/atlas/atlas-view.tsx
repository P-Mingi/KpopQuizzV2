import { getSpaceGraph } from '@/lib/verse/atlas/data';
import { neighborhood } from '@/lib/verse/atlas/graph';

import { AtlasMap } from './atlas-map';

import type { Space } from '@/lib/verse/space';

// V-ATLAS step 2 - the server half of the map. Builds the space graph once,
// picks the hub (default = the space home), computes its neighbourhood with
// server-side deterministic positions, and resolves the breadcrumb trail's
// labels from the full graph. Build mode reveals wanted (red-link) nodes.
export async function AtlasView({ space, hubParam, trailParam, buildMode }: {
  space: Space;
  hubParam?: string | undefined;
  trailParam?: string | undefined;
  buildMode?: boolean | undefined;
}): Promise<React.ReactElement | null> {
  const graph = await getSpaceGraph(space);
  const spaceKey = `space:${space.group.slug}`;
  const hubKey = hubParam && graph.nodes.has(hubParam) ? hubParam : spaceKey;

  const nb = neighborhood(graph, hubKey, { includeWanted: !!buildMode });
  if (nb.nodes.length <= 1) return null;

  // Trail: the visited hub keys, always ending at the current hub. Labels come
  // from the full graph (a past hub may not be in the current neighbourhood).
  const rawTrail = (trailParam ?? '').split('~').map((s) => s.trim()).filter(Boolean);
  const keys = rawTrail.includes(hubKey) ? rawTrail.slice(0, rawTrail.indexOf(hubKey) + 1) : [...rawTrail, hubKey];
  if (keys[0] !== spaceKey) keys.unshift(spaceKey);
  const seen = new Set<string>();
  const trail = keys
    .filter((k) => graph.nodes.has(k) && !seen.has(k) && (seen.add(k), true))
    .map((k) => ({ key: k, label: graph.nodes.get(k)!.label }));

  return <AtlasMap center={nb.center as typeof nb.nodes[number]} nodes={nb.nodes} edges={nb.edges} trail={trail} buildMode={buildMode} />;
}
