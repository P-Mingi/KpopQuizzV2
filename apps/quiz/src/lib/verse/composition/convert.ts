// V-BUILDER-1 Phase 1 - the LOSSLESS converter between today's presentation config
// and the unified Composition. Proven both directions (round-trip) and byte-parity
// on the resolved placements the renderer consumes (see scripts/_vbuilder1-parity).
// No storage change: this is a pure in-memory adapter over verse_spaces.presentation.

import { PRESENTATION_VERSION } from '../presentation/types';
import { COMPOSITION_VERSION } from './types';

import type { Presentation, ModulePlacement } from '../presentation/types';
import type { Composition, Block, Section, BlockStyle } from './types';

// A block id that is deterministic + content-derived (the Nth block of its type in
// stored order), NEVER the array position. Stable for a given config so re-reads
// mint the same ids; persists permanently once the Phase 2 builder saves. New
// blocks the builder inserts will use crypto.randomUUID (built-in, no dep).
function blockId(type: string, nthOfType: number): string {
  return `blk-${type}-${nthOfType}`;
}

/** presentation.modules[] -> one home Section of Blocks. Everything else on the
 * presentation (preset, accent, tabs, banner, stickers, frames, doorways...) is
 * preserved verbatim as `meta`, so the round-trip loses nothing. */
export function presentationToComposition(pres: Presentation): Composition {
  const modules = (pres.modules ?? []).slice()
    // stable block order = zone group, then the existing `order` within the zone.
    // (Render order is by `order` within zone; grouping keeps the array readable.)
    .sort((a, b) => (a.zone === b.zone ? a.order - b.order : a.zone < b.zone ? -1 : 1));

  const nthByType: Record<string, number> = {};
  const blocks: Block[] = modules.map((m) => {
    const nth = nthByType[m.type] ?? 0;
    nthByType[m.type] = nth + 1;
    const block: Block = { id: blockId(m.type, nth), type: m.type, zone: m.zone };
    if (m.hidden !== undefined) block.hidden = m.hidden;
    if (m.props !== undefined) block.props = m.props;
    const style: BlockStyle = {};
    if (m.frame !== undefined) style.frame = m.frame;
    if (m.mode !== undefined) style.mode = m.mode;
    if (Object.keys(style).length > 0) block.style = style;
    return block;
  });

  const section: Section = { id: 'home', width: 'wide', blocks };
  // meta = the presentation minus version + modules, verbatim.
  const meta: Composition['meta'] = {};
  for (const [k, v] of Object.entries(pres)) {
    if (k === 'version' || k === 'modules') continue;
    (meta as Record<string, unknown>)[k] = v;
  }
  return { version: COMPOSITION_VERSION, meta, sections: [section] };
}

/** Composition -> presentation. `order` is reassigned as the block's position within
 * its zone (0..n): render order is by that sequence, so a renormalized order value
 * renders byte-identically. Meta is spread back verbatim. */
export function compositionToPresentation(comp: Composition): Presentation {
  const blocks = comp.sections.flatMap((s) => s.blocks);
  const orderByZone: Record<string, number> = {};
  const modules: ModulePlacement[] = blocks.map((b) => {
    const order = orderByZone[b.zone] ?? 0;
    orderByZone[b.zone] = order + 1;
    const m: ModulePlacement = { type: b.type, zone: b.zone, order };
    if (b.hidden !== undefined) m.hidden = b.hidden;
    if (b.style?.frame !== undefined) m.frame = b.style.frame;
    if (b.style?.mode !== undefined) m.mode = b.style.mode;
    if (b.props !== undefined) m.props = b.props;
    return m;
  });
  return { version: PRESENTATION_VERSION, ...comp.meta, modules };
}
