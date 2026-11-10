// o1/slots (owner, 2026-11-10): the public read of the icon slots, the "Icônes du jeu" of the admin's Photos tab (lib/photos/slots.ts
// ICON_SLOTS). Each slot answers its live settings (site_assets_public, type icon: an icon of the library or the owner's PNG, a circle or
// not, a colour), else the board's defaults: a page always draws an icon, never an empty box. Server only, through the one-minute cache of
// public-read.ts; it fails closed to the defaults (no Supabase settings, 022 not applied, a network error).
import { getLiveAssets } from './public-read';
import { ICON_SLOTS, iconKey, parseIconSettings } from './slots';

import type { LiveAsset } from './public-read';
import type { IconSettings } from './slots';

export interface LiveIcon {
  /** The id of its slot (ICON_SLOTS). */
  readonly id: string;
  readonly cfg: IconSettings;
  /** The 96 px file of a PNG icon; null for an icon of the library. */
  readonly png: string | null;
  /** True when the owner saved this slot (a live row), false for the defaults. */
  readonly live: boolean;
}

/** Every icon slot by id, each with its live settings or its defaults. */
export type LiveIcons = Readonly<Record<string, LiveIcon>>;

export function iconsOf(live: readonly LiveAsset[]): LiveIcons {
  const byKey = new Map(live.filter((a) => a.type === 'icon').map((a) => [a.key, a]));
  const out: Record<string, LiveIcon> = {};
  for (const slot of ICON_SLOTS) {
    const a = byKey.get(iconKey(slot.id));
    const saved = a ? parseIconSettings(a.settings) : null;
    const cfg = saved ?? slot.defaults;
    // A PNG icon draws its 96 px file (the size of these marks); with no file it falls back to the icon of its settings.
    const png = cfg.mode === 'png' ? a?.thumb ?? a?.large ?? null : null;
    out[slot.id] = { id: slot.id, cfg: cfg.mode === 'png' && !png ? { ...cfg, mode: 'icon' } : cfg, png, live: saved !== null };
  }
  return out;
}

/** The icon of a slot; an unknown id (a slot removed from the list) draws the first slot's defaults rather than throwing on a page. */
export function iconOf(icons: LiveIcons, id: string): LiveIcon {
  return icons[id] ?? { id, cfg: ICON_SLOTS[0]!.defaults, png: null, live: false };
}

/** The live icon slots, or every slot's defaults on any failure. */
export async function getLiveIcons(): Promise<LiveIcons> {
  return iconsOf(await getLiveAssets());
}
