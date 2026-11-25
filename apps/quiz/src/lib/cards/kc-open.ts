// KpopCards: how an opening page asks the server for its pack: a theme pack, the pack of the day, a pack bought with shards, or the guest's
// demo pack. One place, so the opening page (OpeningMount) and agent A's contract (a theme and the daily source on POST /api/cards/open) meet here.
export type OpenSpec =
  | { kind: 'theme'; theme: string; packs: 1 | 5; from?: 'shards' }
  | { kind: 'daily' }
  | { kind: 'demo' };

/** The address of the opening page for a spec (the inverse of the route params). */
export function specOf(parts: { segments: readonly string[]; packs?: string | null; from?: string | null; demo?: string | null }): OpenSpec | null {
  const [a] = parts.segments;
  if (a === 'daily') return { kind: 'daily' };
  if (a === 'all' || a === 'girls' || a === 'boys' || a === 'solo') {
    if (parts.demo === '1') return { kind: 'demo' };
    return { kind: 'theme', theme: a, packs: parts.packs === '5' ? 5 : 1, ...(parts.from === 'shards' ? { from: 'shards' as const } : {}) };
  }
  return null;
}

/**
 * The spec of the next opening after "Open another" (`stock`) or "Open 5 more" (`stock5`). From /open/all the address of the next pack is the SAME address
 * (a themed pack is /open/<theme>, five are /open/all?packs=5), so a router.replace to it changes nothing: the page cannot tell a new opening from the
 * one it shows. The mount therefore keeps the spec and a round counter itself and draws again when the round moves (see `runKey`).
 */
export function nextSpec(spec: OpenSpec, then: 'stock' | 'stock5'): OpenSpec {
  if (then === 'stock5') return { kind: 'theme', theme: 'all', packs: 5 };
  return { kind: 'theme', theme: spec.kind === 'theme' ? spec.theme : 'all', packs: 1 };
}

/** The key of one opening: the spec and the round. Two openings of the same spec (open another from /open/all) differ by their round. */
export function runKey(spec: OpenSpec, round: number): string {
  return `${JSON.stringify(spec)}#${round}`;
}
