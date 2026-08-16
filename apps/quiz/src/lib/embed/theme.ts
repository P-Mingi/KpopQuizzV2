// W4b item 2 - embed theming (spec section 8).
//
// Everything here is query-driven so a partner needs no JS. Every input is validated
// and falls back to the default: an unknown or malformed value must never break the
// render, and must NEVER reach CSS as a raw string. That is the whole risk in taking
// colours from a URL, so the hex is re-serialised from a match rather than passed
// through.

export type EmbedTheme = 'light' | 'dark';

export interface EmbedThemeOptions {
  theme: EmbedTheme;
  /** CSS colour string, already safe, or null to leave the token alone. */
  accent: string | null;
  background: string | null;
}

/** 3 or 6 hex chars, no '#'. Anything else is ignored rather than sanitised-ish. */
function safeHex(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw.trim());
  // Rebuilt from the captured group, so only [0-9a-f] can ever reach the stylesheet.
  return m ? `#${m[1]!.toLowerCase()}` : null;
}

export function parseEmbedTheme(params: Record<string, string | string[] | undefined>): EmbedThemeOptions {
  const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
  const rawTheme = first(params.theme);
  return {
    theme: rawTheme === 'dark' ? 'dark' : 'light', // anything unknown -> light
    accent: safeHex(first(params.accent)),
    background: safeHex(first(params.bg)),
  };
}

/**
 * Inline custom properties for the embed root. Only tokens we deliberately expose are
 * overridden, so a partner cannot repaint arbitrary parts of the widget.
 */
export function embedStyle(opts: EmbedThemeOptions): React.CSSProperties {
  const style: Record<string, string> = {};
  if (opts.accent) {
    style['--brand'] = opts.accent;
    style['--brand-btn'] = opts.accent;
  }
  // Default stays transparent so the widget takes the partner page's colour.
  style.background = opts.background ?? 'transparent';
  return style as React.CSSProperties;
}
