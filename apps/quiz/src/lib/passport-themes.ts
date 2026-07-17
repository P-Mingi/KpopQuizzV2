// Passport identity presets (Workstream M, M1.6). Phase 1 = cheap self-expression
// only: a SMALL set of brand-safe accent presets. No animated cards, no premium /
// locked themes (that cosmetic depth is explicitly Phase 3). Accent values are
// mid-ramp colors that read on both light and dark surfaces; the 'default' theme
// keeps var(--brand) so it adapts to dark mode.

export const PASSPORT_THEMES: Record<string, { label: string; swatch: string }> = {
  default: { label: 'Pink', swatch: '#E8457A' },
  purple: { label: 'Purple', swatch: '#7F77DD' },
  blue: { label: 'Blue', swatch: '#378ADD' },
  teal: { label: 'Teal', swatch: '#1D9E75' },
  amber: { label: 'Amber', swatch: '#EF9F27' },
  coral: { label: 'Coral', swatch: '#D85A30' },
};

export const PASSPORT_THEME_KEYS = Object.keys(PASSPORT_THEMES);

export function isValidTheme(t: string): boolean {
  return Object.prototype.hasOwnProperty.call(PASSPORT_THEMES, t);
}

// Accent the passport renders with. 'default' stays var(--brand) (adapts to dark
// mode); presets use their saturated mid-ramp hex (readable on both modes). Only
// the saturated accent is themed; small tinted surfaces keep var(--brand-light).
export function passportAccent(theme: string | null | undefined): string {
  if (!theme || theme === 'default') return 'var(--brand)';
  return PASSPORT_THEMES[theme]?.swatch ?? 'var(--brand)';
}

export const ULT_MAX = 3;
export const BIAS_MAX = 40;
