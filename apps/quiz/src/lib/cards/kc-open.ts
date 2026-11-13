// KpopCards: how an opening page asks the server for its pack: a theme pack, the pack of the day, a focus pack, a pack bought with shards, or the guest's
// demo pack. One place, so the opening page (OpeningMount) and agent A's contract (a theme and the daily source on POST /api/cards/open) meet here.
export type OpenSpec =
  | { kind: 'theme'; theme: string; packs: 1 | 5; from?: 'shards' }
  | { kind: 'daily' }
  | { kind: 'focus'; group: string }
  | { kind: 'demo' };

/** The address of the opening page for a spec (the inverse of the route params). */
export function specOf(parts: { segments: readonly string[]; packs?: string | null; from?: string | null; demo?: string | null }): OpenSpec | null {
  const [a, b] = parts.segments;
  if (a === 'focus' && b) return { kind: 'focus', group: b };
  if (a === 'daily') return { kind: 'daily' };
  if (a === 'all' || a === 'girls' || a === 'boys' || a === 'solo') {
    if (parts.demo === '1') return { kind: 'demo' };
    return { kind: 'theme', theme: a, packs: parts.packs === '5' ? 5 : 1, ...(parts.from === 'shards' ? { from: 'shards' as const } : {}) };
  }
  return null;
}
