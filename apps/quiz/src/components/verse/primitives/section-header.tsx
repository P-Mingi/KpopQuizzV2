// V-HARMONY-1 primitive 1 of 4 - the ONE section header. Every Verse section
// label converges here: the uppercase kicker (token-driven, via .v-eyebrow) plus
// an optional right-aligned action slot ("ALL 17", "See all"). This is the
// section grammar, distinct from PageGrammar (the page's H1 header).
//
// `as` keeps the document outline unchanged during convergence: a section that
// was a plain <p> label stays 'p' (the default); one that was a real heading
// passes as="h2"/"h3". Look is identical either way; only the tag differs.

type HeaderTag = 'p' | 'h2' | 'h3';

export function SectionHeader({ kicker, action, as = 'p', accent = false, className }: {
  kicker: React.ReactNode;
  /** Optional right-aligned affordance: a count ("ALL 17") or a link. */
  action?: React.ReactNode;
  as?: HeaderTag;
  /** The accent-tinted kicker (v-kicker-accent), e.g. "Featured essay". */
  accent?: boolean;
  className?: string;
}): React.ReactElement {
  const Tag = as;
  return (
    <div
      className={`flex items-baseline justify-between gap-3${className ? ` ${className}` : ''}`}
      style={{ marginBottom: 'var(--v-space-eyebrow)' }}
    >
      <Tag className={accent ? 'v-eyebrow v-kicker-accent' : 'v-eyebrow'} style={{ margin: 0 }}>{kicker}</Tag>
      {action ? (
        <span className="shrink-0 text-[12px] font-semibold leading-none" style={{ color: 'var(--verse-ink)' }}>
          {action}
        </span>
      ) : null}
    </div>
  );
}
