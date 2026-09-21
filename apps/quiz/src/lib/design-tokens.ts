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
// UX DASHBOARD v1 tokens (docs/design/ux-dashboard-v1/DESIGN-SPEC.md sections 2
// + 15.3). Verbatim from the owner-validated prototype's :root and
// [data-theme=dark] CSS blocks. ADDED for Phase 0 only - nothing consumes these
// yet, so there is no visual change. Phase 1 emits them as CSS custom properties
// (`--bg`, `--ink`, ...) on `:root` (light) and `:root[data-theme="dark"]`.
// Keys are the CSS variable name without the leading `--`.
// ---------------------------------------------------------------------------

export type UxV1Theme = Record<string, string>;

/** Light theme = the bare `:root` set. */
export const UX_V1_LIGHT: UxV1Theme = {
  bg: '#FAF9F7',
  panel: '#FFFFFF',
  tint: '#F4F2EE',
  tint2: '#EFECE7',
  ink: '#26221D',
  mut: '#6F6A62',
  fnt: '#A6A096',
  line: '#ECE8E1',
  line2: '#E2DDD5',
  pink: '#E8457A',
  'pink-dk': '#C93868',
  'pink-lt': '#FCE8EF',
  'pink-md': '#F7CFDD',
  ok: '#3A8F5C',
  'ok-bg': '#E7F2E1',
  'ok-line': '#9CCB84',
  no: '#C0392B',
  'no-bg': '#FDE8E8',
  'no-line': '#F0A9A9',
  'amber-bg': '#FAF0DC',
  warn: '#B7791F',
  sh: '0 1px 2px rgba(38,34,29,.05)',
  'sh-h': '0 12px 32px rgba(38,34,29,.10)',
};

/** Night theme = the `[data-theme="dark"]` overrides. `warn` is not set by the
 *  prototype's dark block; the dark clue-tag text colour (#E9B963) is used so the
 *  key stays parallel with light (flagged in WIRING-MAP.verified.md). */
export const UX_V1_DARK: UxV1Theme = {
  bg: '#141118',
  panel: '#1C1822',
  tint: '#26212D',
  tint2: '#332C3B',
  ink: '#F1ECE6',
  mut: '#A8A0AF',
  fnt: '#726B7C',
  line: '#2A2532',
  line2: '#3A3343',
  pink: '#E8457A',
  'pink-dk': '#FF7AA5',
  'pink-lt': '#33202A',
  'pink-md': '#5A2A40',
  ok: '#5DE0A0',
  'ok-bg': '#16301F',
  'ok-line': '#2E6B45',
  no: '#FF7A7A',
  'no-bg': '#3A1A1A',
  'no-line': '#7A3030',
  'amber-bg': '#2E2616',
  warn: '#E9B963',
  sh: '0 1px 2px rgba(0,0,0,.3)',
  'sh-h': '0 14px 34px rgba(0,0,0,.45)',
};

/** Shared, theme-independent layout tokens (DESIGN-SPEC section 2 + 3). */
export const UX_V1_LAYOUT = {
  radius: '16px', // cards / panels
  radiusSm: '10px', // small controls
  radiusPill: '999px',
  sidebar: '232px',
  topbar: '64px',
  contentMax: '1200px',
  bottomNav: '62px',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontBase: '14px',
} as const;

/** Type-tag pill tints (Notion-style), background/text per quiz type, per theme.
 *  DESIGN-SPEC section 2 (light) + 15.3 (dark). `level` is the neutral fallback;
 *  the prototype's dark block does not define a `level` tint, so tint2/mut is used. */
export const UX_V1_TYPE_TAGS = {
  light: {
    classic: { bg: '#E8F0F9', fg: '#2C5F94' },
    image: { bg: '#FBE7EF', fg: '#A03A64' },
    intruder: { bg: '#EEEBFA', fg: '#584FA8' },
    tf: { bg: '#E7F2E1', fg: '#42722A' },
    clue: { bg: '#FAF0DC', fg: '#8F5F1E' },
    level: { bg: '#F4F2EE', fg: '#6F6A62' },
  },
  dark: {
    classic: { bg: '#1B2A3A', fg: '#8FBBEA' },
    image: { bg: '#3A1F2C', fg: '#F08BB3' },
    intruder: { bg: '#2A2544', fg: '#B4ABF5' },
    tf: { bg: '#1B2E1B', fg: '#9DD27E' },
    clue: { bg: '#33281A', fg: '#E9B963' },
    level: { bg: '#332C3B', fg: '#A8A0AF' },
  },
} as const;

/** Convenience: the two themes keyed by name, for Phase 1's CSS emitter. */
export const UX_V1_TOKENS = { light: UX_V1_LIGHT, dark: UX_V1_DARK } as const;
