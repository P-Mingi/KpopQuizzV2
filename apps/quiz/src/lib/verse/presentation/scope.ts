// W-CUSTOM step 3 - the verse-scope style for a space, merging the group theme with
// the curator's presentation. Presentation.accent overrides the group color (the
// same --verse-accent token the whole scope derives from, so per-mode readable ink
// keeps working in CSS). Frame + divider choices ride along as tokens the modules
// read. Empty presentation -> identical to the group's default scope.

import { verseScopeStyle, accentPrefersDarkInk } from '@/lib/verse/theme';

import type { Space } from '@/lib/verse/space';
import type { CSSProperties } from 'react';

export function presentationScopeStyle(space: Space): CSSProperties {
  const style = { ...(verseScopeStyle(space.group) as Record<string, string>) };
  const pres = space.presentation;

  if (pres.accent) {
    style['--verse-accent'] = pres.accent;
    // Re-derive the solid-fill text pair for the new accent (black on light accents,
    // white on dark). The mode-aware --verse-ink derivation stays in globals.css.
    style['--verse-accent-text'] = accentPrefersDarkInk(pres.accent) ? '#141210' : '#ffffff';
  }
  // Frame + divider tokens (pure CSS, read by module frames / dividers).
  style['--verse-frame'] = pres.frames?.default ?? 'none';
  style['--verse-divider'] = pres.frames?.divider ?? 'line';
  return style as CSSProperties;
}
