// V-POLISH-2 C3 - CITATIONS AS JEWELRY. One shared reader-surface citation
// mark: a superscript ring chip carrying the outlet's name, replacing the
// [SOURCE] brackets and the wd/cur shorthand wherever READERS look. Editors
// keep their functional chips; this is the covenant worn as punctuation.

const OUTLETS: [RegExp, string][] = [
  [/musicbrainz\.org/i, 'MusicBrainz'],
  [/wikidata\.org/i, 'Wikidata'],
  [/soompi\.com/i, 'Soompi'],
  [/billboard\.com/i, 'Billboard'],
  [/koreaboo\.com/i, 'Koreaboo'],
  [/weverse/i, 'Weverse'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
];

export function outletName(href: string | null | undefined, fallback = 'Source'): string {
  if (!href) return fallback;
  for (const [re, name] of OUTLETS) if (re.test(href)) return name;
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    const base = host.split('.')[0] ?? host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch { return fallback; }
}

/** The ring glyph at chip scale: the brand's orbit, minimal enough for 10px. */
function RingGlyph(): React.ReactElement {
  return (
    <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden style={{ flexShrink: 0 }}>
      <ellipse cx="6" cy="6" rx="5" ry="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" transform="rotate(-18 6 6)" />
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Inline superscript citation. `label` overrides the outlet lookup (e.g. a
 * provenance name like Wikidata when there is no URL to inspect). */
export function SourceChip({ href, label, detail }: {
  href?: string | null | undefined; label?: string | undefined; detail?: string | undefined;
}): React.ReactElement | null {
  const name = label ?? outletName(href);
  const body = (
    <span className="inline-flex items-center gap-[3px] rounded-full border px-1.5 py-px align-super text-[9px] font-bold uppercase tracking-[0.06em] no-underline"
      style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)', lineHeight: 1.5 }} title={detail ?? (href ?? undefined)}>
      <RingGlyph />
      {name}
    </span>
  );
  if (!href) return body;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Source: ${name}`} className="no-underline">
      {body}
    </a>
  );
}
