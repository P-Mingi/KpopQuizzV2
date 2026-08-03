// V-HARMONY-2A step 4 - the DOORWAY REGISTRY. A curator personalizes how each
// door TYPE renders (link / button / card / feature) and can rename its heading,
// per space. This rides verse_spaces.presentation (the W-CUSTOM jsonb): NO
// migration - the column already stores arbitrary presentation shape and the
// app validator is the only gate (validate.ts copies `doorways` through).
//
// SEO INVARIANT (LAW): the FORMAT is a SKIN. Every format emits the target's
// real <a href> + true title in the crawlable HTML (enforced structurally in
// <DoorwayList>). A custom `label` overrides the SECTION heading only - never a
// target's title or href. So a richly-configured space and a default space emit
// an identical set of hrefs + link text; only the wrapper markup differs.

/** The four affordances a curator can pick per door. Mirrors the W-CUSTOM
 * per-item "format" idea (FrameStyle) but names link/button/card/feature. */
export type DoorwayFormat = 'link' | 'button' | 'card' | 'feature';
export const DOORWAY_FORMATS: DoorwayFormat[] = ['link', 'button', 'card', 'feature'];

/** The formatted content doors (the breadcrumb is structural, always a
 * breadcrumb, and carries no format). */
export type DoorwayId = 'pagesInside' | 'moreAboutThis' | 'whatLinksHere';
export const DOORWAY_IDS: DoorwayId[] = ['pagesInside', 'moreAboutThis', 'whatLinksHere'];

export interface DoorwayConfig {
  format: DoorwayFormat;
  /** Section-heading override (display only; never touches a target's title). */
  label?: string;
  /** De-emphasize the door as a native <details> disclosure. This is NOT a
   * hide: the links + titles stay in the crawlable HTML (the browser only
   * visually collapses them), so the SEO invariant holds. */
  collapsed?: boolean;
}

/** Keyed-by-door map (the textFolds precedent). Absent -> every door uses its
 * default. Partial -> unset doors fall back to defaults. */
export type DoorwayConfigMap = Partial<Record<DoorwayId, DoorwayConfig>>;

// Sensible defaults (doc): children = a link list, the entity door = cards.
export const DOORWAY_DEFAULTS: Record<DoorwayId, DoorwayConfig> = {
  pagesInside: { format: 'link' },
  moreAboutThis: { format: 'card' },
  whatLinksHere: { format: 'link' },
};

/** Default heading each door shows when the curator sets no custom label. */
export const DOORWAY_DEFAULT_HEADING: Record<DoorwayId, string> = {
  pagesInside: 'Pages inside this',
  moreAboutThis: 'More about this',
  whatLinksHere: 'What links here',
};

/** Studio-facing human names for the three doors. */
export const DOORWAY_STUDIO_LABEL: Record<DoorwayId, string> = {
  pagesInside: 'Pages inside this',
  moreAboutThis: 'More about this',
  whatLinksHere: 'What links here',
};

export const DOORWAY_MAX_LABEL = 40;

/** Effective config for one door: the space override merged over the default.
 * Pure + unit-testable; the SEO invariant does not live here (it lives in the
 * renderer), so this only decides skin + heading. */
export function resolveDoorway(doorways: DoorwayConfigMap | undefined, id: DoorwayId): DoorwayConfig {
  const base = DOORWAY_DEFAULTS[id];
  const d = doorways?.[id];
  return {
    format: d?.format ?? base.format,
    ...(d?.label ? { label: d.label } : {}),
    ...(d?.collapsed ? { collapsed: true } : {}),
  };
}
