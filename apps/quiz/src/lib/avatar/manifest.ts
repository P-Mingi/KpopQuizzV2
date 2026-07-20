// Avatar layer manifest (Workstream M, M1.27). Single source of truth for the
// avatar builder: every category's options, asset path, an `unlocked` flag for
// the future earned/premium seam, and a per-asset TRANSFORM for exact alignment.
// The editor grids, the live-preview compositor, AND the server-side flatten are
// all driven by this file, so art + alignment changes are a manifest edit.

export type AvatarCategory =
  | 'background' | 'base' | 'clothes' | 'hair' | 'hat' | 'item' | 'frame';

// Paint order, back to front. Both compositors stack layers in exactly this order
// on a shared 1024 canvas so every layer stays registered + aligned.
export const AVATAR_Z_ORDER: AvatarCategory[] = [
  'background', 'base', 'clothes', 'hair', 'hat', 'item', 'frame',
];

// Placement of a 1024 layer over the 1024 base. x/y shift the layer's CENTER from
// the canvas center in 1024px units; scale multiplies the layer size (around the
// center); rotate is degrees clockwise (around the center). Preview (CSS) + flatten
// (sharp) apply this identically, so the flattened PNG matches the live preview.
export interface AvatarTransform {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export const IDENTITY_TRANSFORM: AvatarTransform = { x: 0, y: 0, scale: 1, rotate: 0 };

export interface AvatarOption {
  key: string; // stable id within its category
  label: string; // display name
  asset: string | null; // public path, or null for the "None" choice
  unlocked: boolean; // earned/premium seam; true = always available for now
  transform?: Partial<AvatarTransform>; // per-asset override over the category default
}

export interface HairColorOption {
  key: string;
  label: string;
  swatch: string; // hex chip shown in the Hair color grid
  unlocked: boolean;
}

const opt = (
  key: string,
  label: string,
  asset: string | null,
  transform?: Partial<AvatarTransform>,
  unlocked = true,
): AvatarOption => ({ key, label, asset, unlocked, ...(transform ? { transform } : {}) });

// Per-category default transform. Most assets are already roughly centered on the
// 1024 frame, so defaults are identity; per-asset overrides fix the offenders.
export const CATEGORY_TRANSFORM: Record<AvatarCategory, AvatarTransform> = {
  background: IDENTITY_TRANSFORM,
  base: IDENTITY_TRANSFORM,
  clothes: IDENTITY_TRANSFORM,
  hair: IDENTITY_TRANSFORM,
  hat: IDENTITY_TRANSFORM,
  item: IDENTITY_TRANSFORM,
  frame: IDENTITY_TRANSFORM,
};

// The base body is fixed (single black rabbit; rabbit1-5 / old fullBody ignored).
export const AVATAR_BASE = '/avatar/base/rabbit.png';

// Hair geometry varies by style (not color), so the transform lives on the style.
export const HAIR_STYLES: AvatarOption[] = [
  opt('long-bangs', 'Long bangs', null),
  opt('space-buns', 'Space buns', null),
  opt('ponytail', 'Ponytail', null, { x: -14, y: 6, scale: 0.9 }),
  opt('wavy', 'Wavy', null),
  opt('crop', 'Crop', null, { y: -6, scale: 0.98 }),
];

export const HAIR_COLORS: HairColorOption[] = [
  { key: 'brown', label: 'Brown', swatch: '#6B4A2B', unlocked: true },
  { key: 'pink', label: 'Pink', swatch: '#E59ABF', unlocked: true },
  { key: 'blond', label: 'Blond', swatch: '#E8C766', unlocked: true },
  { key: 'red', label: 'Red', swatch: '#C0394B', unlocked: true },
  { key: 'grey', label: 'Grey', swatch: '#B8BCC4', unlocked: true },
];

export const DEFAULT_HAIR_COLOR = 'brown';

// Hair art is one file per style+color, so derive the path rather than list 25 rows.
export function hairAsset(style: string, color: string): string {
  return `/avatar/hair/hair_${style}_${color}.png`;
}

export const CLOTHES: AvatarOption[] = [
  opt('denim', 'Denim jacket', '/avatar/clothes/denim.png'),
  opt('varsity', 'Varsity', '/avatar/clothes/varsity.png'),
  opt('cardigan', 'Cardigan', '/avatar/clothes/cardigan.png'),
  opt('cardigan-cream', 'Cream cardigan', '/avatar/clothes/cardigan-cream.png'),
  opt('sweater-pink', 'Pink sweater', '/avatar/clothes/sweater-pink.png'),
  opt('jacket-floral', 'Floral jacket', '/avatar/clothes/jacket-floral.png'),
];

export const HATS: AvatarOption[] = [
  opt('party-hat', 'Party hat', '/avatar/hats/party-hat.png', { y: -6 }),
  opt('beret', 'Beret', '/avatar/hats/beret.png', { y: -4, scale: 1.1 }),
  opt('beanie', 'Beanie', '/avatar/hats/beanie.png'),
  opt('tiara', 'Tiara', '/avatar/hats/tiara.png', { y: -8 }),
  opt('bow', 'Bow', '/avatar/hats/bow.png', { y: -6 }),
  opt('fedora', 'Fedora', '/avatar/hats/fedora.png', { y: 4, scale: 0.9 }),
];

export const ITEMS: AvatarOption[] = [
  opt('headphones', 'Headphones', '/avatar/items/headphones.png'),
  opt('collar', 'Collar', '/avatar/items/collar.png'),
];

// Backgrounds + frames arrive later; the grids already render their "None" state.
export const BACKGROUNDS: AvatarOption[] = [];
export const FRAMES: AvatarOption[] = [];

// The editor's selected state. Stores keys (serializable + validated server-side),
// not paths; selectionToLayers resolves keys -> ordered asset paths + transforms.
export interface AvatarSelection {
  hairStyle: string | null;
  hairColor: string;
  clothes: string | null;
  hat: string | null;
  item: string | null;
  background: string | null;
  frame: string | null;
}

export const DEFAULT_SELECTION: AvatarSelection = {
  hairStyle: 'wavy',
  hairColor: DEFAULT_HAIR_COLOR,
  clothes: null,
  hat: null,
  item: null,
  background: null,
  frame: null,
};

export interface ResolvedLayer {
  category: AvatarCategory;
  asset: string;
  transform: AvatarTransform;
}

export function resolveTransform(
  category: AvatarCategory,
  override?: Partial<AvatarTransform>,
): AvatarTransform {
  return { ...CATEGORY_TRANSFORM[category], ...override };
}

function findOption(options: AvatarOption[], key: string | null): AvatarOption | undefined {
  if (!key) return undefined;
  return options.find((o) => o.key === key);
}

export function assetForKey(options: AvatarOption[], key: string | null): string | null {
  return findOption(options, key)?.asset ?? null;
}

// Resolve a selection into ordered layers (asset + transform) for the compositor.
// Identical output is consumed by the live preview and the server-side flatten.
export function selectionToLayers(sel: AvatarSelection): ResolvedLayer[] {
  const out: ResolvedLayer[] = [];
  const push = (category: AvatarCategory, asset: string | null, override?: Partial<AvatarTransform>) => {
    if (asset) out.push({ category, asset, transform: resolveTransform(category, override) });
  };

  const bg = findOption(BACKGROUNDS, sel.background);
  push('background', bg?.asset ?? null, bg?.transform);
  push('base', AVATAR_BASE);
  const clothes = findOption(CLOTHES, sel.clothes);
  push('clothes', clothes?.asset ?? null, clothes?.transform);
  const style = findOption(HAIR_STYLES, sel.hairStyle);
  push('hair', sel.hairStyle ? hairAsset(sel.hairStyle, sel.hairColor) : null, style?.transform);
  const hat = findOption(HATS, sel.hat);
  push('hat', hat?.asset ?? null, hat?.transform);
  const item = findOption(ITEMS, sel.item);
  push('item', item?.asset ?? null, item?.transform);
  const frame = findOption(FRAMES, sel.frame);
  push('frame', frame?.asset ?? null, frame?.transform);

  return out;
}

// CSS transform string for the live preview. The layer <img> fills the canvas
// (= 1024), so x/y become a percentage of the canvas; scale + rotate are around
// the center. Mirrored exactly by the sharp flatten.
export function transformToCss(t: AvatarTransform): string {
  const tx = (t.x / 1024) * 100;
  const ty = (t.y / 1024) * 100;
  return `translate(${tx}%, ${ty}%) scale(${t.scale}) rotate(${t.rotate}deg)`;
}

// Validate an untrusted selection against the manifest (server-side authority).
// Returns a clean selection or null if anything is unknown / locked.
export function validateSelection(input: unknown): AvatarSelection | null {
  if (typeof input !== 'object' || input === null) return null;
  const o = input as Record<string, unknown>;

  const okOption = (options: AvatarOption[], v: unknown): v is string =>
    typeof v === 'string' && options.some((x) => x.key === v && x.unlocked);

  const hairStyle =
    o.hairStyle === null || o.hairStyle === undefined
      ? null
      : okOption(HAIR_STYLES, o.hairStyle)
        ? (o.hairStyle as string)
        : undefined;
  if (hairStyle === undefined) return null;

  const hairColor =
    typeof o.hairColor === 'string' && HAIR_COLORS.some((c) => c.key === o.hairColor && c.unlocked)
      ? o.hairColor
      : DEFAULT_HAIR_COLOR;

  const optional = (options: AvatarOption[], v: unknown): string | null | undefined =>
    v === null || v === undefined ? null : okOption(options, v) ? (v as string) : undefined;

  const clothes = optional(CLOTHES, o.clothes);
  const hat = optional(HATS, o.hat);
  const item = optional(ITEMS, o.item);
  const background = optional(BACKGROUNDS, o.background);
  const frame = optional(FRAMES, o.frame);
  if (clothes === undefined || hat === undefined || item === undefined || background === undefined || frame === undefined) {
    return null;
  }

  return { hairStyle, hairColor, clothes, hat, item, background, frame };
}
