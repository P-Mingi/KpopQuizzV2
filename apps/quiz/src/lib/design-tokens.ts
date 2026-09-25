// -- BUTTON VARIANTS --
export const BUTTON_STYLES = {
  primary: {
    padding: '8px 16px', borderRadius: 10,
    background: '#D4537E', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(212,83,126,0.2)',
  },
  secondary: {
    padding: '8px 16px', borderRadius: 10,
    background: 'rgba(212,83,126,0.06)', color: '#D4537E',
    border: '1px solid rgba(212,83,126,0.15)',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  ghost: {
    padding: '8px 16px', borderRadius: 10,
    background: 'transparent', color: '#888780',
    border: '1px solid #e8e6e0',
    fontSize: 11, fontWeight: 500, cursor: 'pointer',
  },
  danger: {
    padding: '8px 16px', borderRadius: 10,
    background: '#e74c3c', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
} as const;

// -- TAG COLORS BY CATEGORY --
export const TAG_COLORS = {
  type: {
    Classic: { background: 'rgba(212,83,126,0.08)', color: '#D4537E' },
    Image: { background: 'rgba(74,144,208,0.08)', color: '#4a90d0' },
    Intruder: { background: 'rgba(154,122,204,0.08)', color: '#9a7acc' },
    'True/False': { background: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Clues: { background: 'rgba(232,160,96,0.08)', color: '#e8a060' },
  },
  difficulty: {
    Easy: { background: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Medium: { background: 'rgba(232,160,96,0.08)', color: '#e8a060' },
    Hard: { background: 'rgba(231,76,60,0.08)', color: '#e74c3c' },
  },
  group: { background: 'rgba(128,80,160,0.08)', color: '#8050a0' },
} as const;

export const TAG_BASE_STYLE = {
  fontSize: 9, fontWeight: 600,
  padding: '3px 8px', borderRadius: 6,
  display: 'inline-block',
} as const;

export function getTagStyle(category: 'type' | 'difficulty' | 'group', value?: string) {
  if (category === 'group') return { ...TAG_BASE_STYLE, ...TAG_COLORS.group };
  const colors = TAG_COLORS[category] as Record<string, { background: string; color: string }>;
  const match = value ? colors[value] : undefined;
  return { ...TAG_BASE_STYLE, ...(match || TAG_COLORS.type.Classic) };
}

// ---------------------------------------------------------------------------
// UX v11.2 tokens (DESIGN-SPEC 16.1 + 17.1 + 17.10 + 17.11), verbatim from the
// pinned prototype (docs/design/ux-dashboard-v1/prototype.html). The CSS custom
// properties live in src/styles/ux-v1/a0.css as `--ux-<key>` on html.ux-v1 (light)
// and html.ux-v1.dark / system dark. This object is the same set for code that
// needs a value in JS (OG images, canvas, tests). a0.test.ts keeps the two in
// sync. Keys are the CSS variable name without the leading `--ux-`.
// Supersedes the Phase 0 UX_V1_* tokens (sidebar era), which nothing consumed.
// ---------------------------------------------------------------------------

export type UxThemeTokens = Record<string, string>;

export const UX_TOKENS_LIGHT: UxThemeTokens = {
  page: '#FFFFFF', surface: '#F7F6F4', 'surface-2': '#F0EEEA', raised: '#FFFFFF',
  hair: '#ECE9E4', line: '#ECE8E3', 'line-2': '#F3F1EE', edge: '#E5E0DA', 'pink-line': '#F2CFDB',
  input: '#8C857C',
  ink: '#1F1B17', muted: '#6B655E',
  pink: '#E8457A', 'pink-fill': '#D13A6E', 'pink-fill-h': '#BE2F62', 'pink-ink': '#C93868',
  'pink-soft': '#FCE8EF', 'pink-soft-ink': '#B3305C',
  ok: '#257547', 'ok-soft': '#E9F4EC', no: '#B83A34', 'no-soft': '#FBECEA', warn: '#9A5B0F',
  'on-ok': '#FFFFFF', 'knob-off': '#FFFFFF',
  'qotd-edge': '#F4D6E1', 'lav-soft': '#EEEDFE', 'lav-ink': '#3C3489', hl: '#DB4B7E',
  bulb: '#E0A100', 'bulb-fill': '#FFE9A6', 'theme-band': '#FBE4D8',
  // name accents of lib/passport-flair.ts, clamped to AA on every light ground
  'acc-pink': '#BC3863', 'acc-purple': '#665FB1', 'acc-blue': '#2B6CAC', 'acc-teal': '#167859', 'acc-amber': '#975D08', 'acc-coral': '#B14A27',
  // rarity words (lib/badges.ts RARITY_COLOR), clamped to AA on light grounds
  'rar-common': '#646A78', 'rar-uncommon': '#19793F', 'rar-rare': '#2F67C2', 'rar-epic': '#8B47CD', 'rar-legendary': '#896200',
};

export const UX_TOKENS_DARK: UxThemeTokens = {
  page: '#141312', surface: '#1C1B19', 'surface-2': '#232120', raised: '#1C1B19',
  hair: '#2F2C29', line: '#2B2826', 'line-2': '#242220', edge: '#35312E', 'pink-line': '#4A2A37',
  input: '#6E6A64',
  ink: '#F3F0EB', muted: '#A8A198',
  pink: '#E8457A', 'pink-fill': '#D13A6E', 'pink-fill-h': '#BE2F62', 'pink-ink': '#FF7AA5',
  'pink-soft': '#3A2129', 'pink-soft-ink': '#FF9DBC',
  ok: '#4FC07F', 'ok-soft': '#16261C', no: '#FF7A70', 'no-soft': '#2E1917', warn: '#E3A24A',
  'on-ok': '#141312', 'knob-off': '#A8A198',
  'qotd-edge': '#40283A', 'lav-soft': '#26233F', 'lav-ink': '#C9C4FF', hl: '#FF7AA5',
  bulb: '#F5C542', 'bulb-fill': 'rgba(245,197,66,.22)', 'theme-band': '#3A2620',
  // name accents, clamped to AA on every dark ground
  'acc-pink': '#EB618E', 'acc-purple': '#8D86E1', 'acc-blue': '#4995E0', 'acc-teal': '#28A37C', 'acc-amber': '#CA8117', 'acc-coral': '#DE734F',
  'rar-common': '#8B93A7', 'rar-uncommon': '#26A558', 'rar-rare': '#5190F7', 'rar-epic': '#B56FF8', 'rar-legendary': '#E0A100',
};

/** Theme-independent layout scale (DESIGN-SPEC 16.3 + 16.4). */
export const UX_LAYOUT = {
  wide: 1120, text: 720, stage: 600, gutter: 32, gutterMobile: 20,
  navHeight: 64, tabBarHeight: 64, pageTop: 56, pageTopMobile: 28,
  sectionGap: 64, sectionGapHome: 80, sectionGapMobile: 48,
  radius: { thumb: 8, input: 12, card: 16, quizCard: 18, box: 20, hero: 24, pill: 999 },
  breakpoints: { phone: 760, tablet: 900, narrow: 1100, iconsInNav: 1280 },
} as const;

export const UX_TOKENS = { light: UX_TOKENS_LIGHT, dark: UX_TOKENS_DARK } as const;
