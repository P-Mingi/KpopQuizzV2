// Curated identity flair presets (Workstream M, M1.26). Small, brand-safe sets so
// names stay readable in BOTH light and dark and there is no arbitrary-color /
// font abuse surface. The single source of truth for the PersonCard flair carrier
// and for server-side validation in /api/auth/update-profile.

// Name accent = the colour the username renders in. 'default' keeps the normal
// text colour (adapts to dark mode); presets are mid-ramp hues readable on both
// light and dark card surfaces (same family as the M1.6 theme swatches).
export const NAME_ACCENTS: Record<string, { label: string; color: string }> = {
  default: { label: 'Default', color: 'var(--txt1)' },
  pink: { label: 'Pink', color: '#E8457A' },
  purple: { label: 'Purple', color: '#7F77DD' },
  blue: { label: 'Blue', color: '#378ADD' },
  teal: { label: 'Teal', color: '#1D9E75' },
  amber: { label: 'Amber', color: '#C77A0B' },
  coral: { label: 'Coral', color: '#D85A30' },
};

// Name font = a tiny curated type set using web-safe stacks (no extra font
// loading, keeps the bundle lean). All legible.
export const NAME_FONTS: Record<string, { label: string; family: string }> = {
  default: { label: 'Default', family: 'inherit' },
  serif: { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Mono', family: 'ui-monospace, "SF Mono", Menlo, monospace' },
};

// Preset avatars = a small palette of solid brand-safe circles (initials on top).
// The M1.27 custom-avatar builder plugs into the SAME avatar slot via avatar_ref.
export const AVATAR_PRESETS: Record<string, { label: string; bg: string; fg: string }> = {
  blossom: { label: 'Blossom', bg: '#E8457A', fg: '#FFFFFF' },
  lilac: { label: 'Lilac', bg: '#7F77DD', fg: '#FFFFFF' },
  sky: { label: 'Sky', bg: '#378ADD', fg: '#FFFFFF' },
  mint: { label: 'Mint', bg: '#1D9E75', fg: '#FFFFFF' },
  honey: { label: 'Honey', bg: '#EF9F27', fg: '#3A2A06' },
  coral: { label: 'Coral', bg: '#D85A30', fg: '#FFFFFF' },
};

export const AVATAR_KINDS = ['photo', 'preset', 'custom'] as const;
export type AvatarKind = (typeof AVATAR_KINDS)[number];

export const NAME_ACCENT_KEYS = Object.keys(NAME_ACCENTS);
export const NAME_FONT_KEYS = Object.keys(NAME_FONTS);
export const AVATAR_PRESET_KEYS = Object.keys(AVATAR_PRESETS);

export function isValidNameAccent(k: string): boolean { return Object.prototype.hasOwnProperty.call(NAME_ACCENTS, k); }
export function isValidNameFont(k: string): boolean { return Object.prototype.hasOwnProperty.call(NAME_FONTS, k); }
export function isValidAvatarKind(k: string): k is AvatarKind { return (AVATAR_KINDS as readonly string[]).includes(k); }
export function isValidAvatarPreset(k: string): boolean { return Object.prototype.hasOwnProperty.call(AVATAR_PRESETS, k); }

export function nameAccentColor(key: string | null | undefined): string {
  return (key && NAME_ACCENTS[key]?.color) || 'var(--txt1)';
}
export function nameFontFamily(key: string | null | undefined): string {
  return (key && NAME_FONTS[key]?.family) || 'inherit';
}
