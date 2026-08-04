// V-BUILDER-2 step 4 - the v1 PATTERN set (locked co-design 5, ledger L-027). PURE
// CONFIG DATA: a pattern is a named list of real registry block types. Inserting one
// drops each block with its OWN fresh id and DISSOLVES immediately (no persistent
// group). Blocks a space cannot feed get the honest-hint treatment, never fabricated
// content. Every type below exists in BLOCK_SPECS (structural completeness, no drift).

export interface PatternBlock { type: string; props?: Record<string, unknown> }
export interface PatternSpec {
  id: string;
  name: string;
  description: string;
  blocks: PatternBlock[];
}

export const PATTERNS: PatternSpec[] = [
  { id: 'hero-vitals', name: 'Hero + vitals', description: 'A welcome lede over the one-line vitals.', blocks: [{ type: 'intro' }, { type: 'vitals' }] },
  { id: 'meet-members', name: 'Meet the members', description: 'The member grid with the latest releases.', blocks: [{ type: 'members' }, { type: 'discography' }] },
  { id: 'era-spotlight', name: 'Era spotlight', description: 'The era spine and timeline.', blocks: [{ type: 'timeline' }] },
  { id: 'comeback-countdown', name: 'Comeback countdown', description: 'The current era plus the next dated moment.', blocks: [{ type: 'countdown' }] },
  { id: 'collector-corner', name: 'Collector corner', description: 'The photocard binder and collectibles shelf.', blocks: [{ type: 'binder_widget' }, { type: 'shelf_widget' }] },
  { id: 'new-fan-start', name: 'New fan starts here', description: 'A welcome lede plus doorways to go deeper.', blocks: [{ type: 'intro' }, { type: 'go_deeper' }] },
];

export function patternById(id: string): PatternSpec | null {
  return PATTERNS.find((p) => p.id === id) ?? null;
}
