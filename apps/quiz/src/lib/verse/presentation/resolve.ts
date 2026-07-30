// W-CUSTOM - resolve an effective module layout from a presentation config. Empty
// or absent config -> the default placements, which map to today's home exactly.
// The SEO INVARIANT is enforced here too (belt and suspenders with validate.ts):
// every seoCritical default block is force-injected if a config somehow omits it,
// so the indexable content is identical whether config is empty, rich, or broken.

import { BLOCK_REGISTRY, defaultSeoCriticalTypes } from './registry';
import { EMPTY_PRESENTATION } from './types';

import type { Zone } from './registry';
import type { Presentation, ModulePlacement } from './types';

/** The default (empty-config) placements = today's implemented modules, in order. */
export function defaultPlacements(): ModulePlacement[] {
  return Object.values(BLOCK_REGISTRY)
    .filter((b) => b.defaultZone !== null && b.implemented)
    .map((b) => ({ type: b.type, zone: b.defaultZone as Zone, order: b.defaultOrder, hidden: false }))
    .sort((a, b) => a.order - b.order);
}

/** Effective, SEO-safe placements for a config. */
export function resolvePlacements(pres: Presentation | null | undefined): ModulePlacement[] {
  const p = pres ?? EMPTY_PRESENTATION;
  const base = p.modules && p.modules.length > 0 ? [...p.modules] : defaultPlacements();

  // SEO INVARIANT: inject any seoCritical default block missing from the config,
  // and force-unhide any seoCritical block, so it can never be dropped or hidden.
  const present = new Set(base.map((m) => m.type));
  for (const req of defaultSeoCriticalTypes()) {
    if (!present.has(req)) {
      const def = BLOCK_REGISTRY[req]!;
      base.push({ type: req, zone: def.defaultZone as Zone, order: def.defaultOrder, hidden: false });
    }
  }
  return base.map((m) => (BLOCK_REGISTRY[m.type]?.seoCritical ? { ...m, hidden: false } : m));
}

/** Placements for one zone, visible only, in order. */
export function placementsForZone(placements: ModulePlacement[], zone: Zone): ModulePlacement[] {
  return placements
    .filter((m) => m.zone === zone && !m.hidden)
    .sort((a, b) => a.order - b.order);
}
