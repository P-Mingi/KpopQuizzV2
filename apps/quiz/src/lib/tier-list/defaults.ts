import type { Tier } from './types';

// The key for the unranked tray (items not yet placed on a tier).
export const UNRANKED = 'unranked';

// Default tiers, colours verbatim from the design (Main.dc.html:23, the maker
// artboard): S tied to the brand rose, then a warm-to-cool ramp down to grey F.
// The maker renders S..D by default; F ships as a ready colour for an added tier.
// (The artboard note says "six default tiers" but renders five; pixel-parity
// follows the rendered board - five rows - with F available on "add tier".)
export const DEFAULT_TIERS: Tier[] = [
  { label: 'S', color: '#E8457A', ord: 0 },
  { label: 'A', color: '#F5894D', ord: 1 },
  { label: 'B', color: '#EBB33E', ord: 2 },
  { label: 'C', color: '#5FA65A', ord: 3 },
  { label: 'D', color: '#4F9BD9', ord: 4 },
];

// The extra colour available when a user adds a tier (grey F from the palette),
// then the brand family cycles for any further tiers.
export const ADDABLE_TIER_COLORS: string[] = [
  '#9E998F', // F (grey)
  '#A83A8F', // plum
  '#7B3FA8', // violet
];

/** A fresh copy of the default tiers (never share the module-level array). */
export function defaultTiers(): Tier[] {
  return DEFAULT_TIERS.map((t) => ({ ...t }));
}

/** Tier presets offered in the create wizard (CreatePool.dc.html). Each returns
 *  a fresh array. 'sd' is the default board; 'sf' adds the grey F row; 'top3' is
 *  a podium (three tiers). All labels/colours come from the palette above. */
export type TierPreset = 'sd' | 'sf' | 'top3';
export const TIER_PRESET_LABELS: Record<TierPreset, string> = { sd: 'S-D', sf: 'S-F', top3: 'Top 3' };
export function tiersForPreset(preset: TierPreset): Tier[] {
  if (preset === 'sf') {
    return [...DEFAULT_TIERS.map((t) => ({ ...t })), { label: 'F', color: '#9E998F', ord: 5 }];
  }
  if (preset === 'top3') {
    return [
      { label: '1', color: '#E8457A', ord: 0 },
      { label: '2', color: '#F5894D', ord: 1 },
      { label: '3', color: '#EBB33E', ord: 2 },
    ];
  }
  return defaultTiers();
}
