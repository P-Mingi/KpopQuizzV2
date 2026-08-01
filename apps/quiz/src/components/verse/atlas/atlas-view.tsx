import { getSpaceGraph } from '@/lib/verse/atlas/data';
import { neighborhood } from '@/lib/verse/atlas/graph';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';

import { AtlasMap } from './atlas-map';

import type { Space } from '@/lib/verse/space';
import type { NeighborhoodPayload } from './atlas-map';

// V-ATLAS step 2/4 - the server half of the map. Builds the space graph once,
// picks the hub (default = the space home), computes its neighbourhood with
// server-side deterministic positions, and resolves the breadcrumb trail.
//
// Red-link law, enforced HERE: the wanted-augmented neighbourhood is computed
// and shipped ONLY when the viewer is contributor+ (may create pages). Readers
// and members never receive wanted nodes, so there is no dead affordance and no
// draft-slug leak. Whether a contributor SEES the wanted layer is the client
// Build-mode toggle; the map swaps between the two server-computed sets.
export async function AtlasView({ space, hubParam, trailParam }: {
  space: Space;
  hubParam?: string | undefined;
  trailParam?: string | undefined;
}): Promise<React.ReactElement | null> {
  const graph = await getSpaceGraph(space);
  const spaceKey = `space:${space.group.slug}`;
  const hubKey = hubParam && graph.nodes.has(hubParam) ? hubParam : spaceKey;

  const readerNb = neighborhood(graph, hubKey);
  if (readerNb.nodes.length <= 1) return null;

  const { role } = await currentSpaceRole(space.group.id);
  const canContribute = roleAtLeast(role, 'contributor');
  const buildNb = canContribute ? neighborhood(graph, hubKey, { includeWanted: true }) : null;

  // Trail: the visited hub keys, always ending at the current hub. Labels come
  // from the full graph (a past hub may not be in the current neighbourhood).
  const rawTrail = (trailParam ?? '').split('~').map((s) => s.trim()).filter(Boolean);
  const keys = rawTrail.includes(hubKey) ? rawTrail.slice(0, rawTrail.indexOf(hubKey) + 1) : [...rawTrail, hubKey];
  if (keys[0] !== spaceKey) keys.unshift(spaceKey);
  const seen = new Set<string>();
  const trail = keys
    .filter((k) => graph.nodes.has(k) && !seen.has(k) && (seen.add(k), true))
    .map((k) => ({ key: k, label: graph.nodes.get(k)!.label }));

  const reader: NeighborhoodPayload = { center: readerNb.center as NeighborhoodPayload['center'], nodes: readerNb.nodes, edges: readerNb.edges };
  const build: NeighborhoodPayload | null = buildNb ? { center: buildNb.center as NeighborhoodPayload['center'], nodes: buildNb.nodes, edges: buildNb.edges } : null;

  return <AtlasMap groupSlug={space.group.slug} reader={reader} build={build} trail={trail} />;
}
