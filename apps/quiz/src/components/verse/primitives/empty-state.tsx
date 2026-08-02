// V-HARMONY-1 primitive 2 of 4 - the ONE empty state. Replaces ~20 hand-rolled
// phrasings ("being prepared" x5, "No X yet" in a dozen variants, "Nothing
// here", "Start writing"). ONE structure (headline, one-line body, optional CTA)
// and ONE voice, with FOUR honest variants that must never share copy:
//
//   empty    - no data yet. An invitation, not an apology. ("No essays yet.
//              Write the first one.")
//   growing  - some data exists, more is welcome. ("This corner is still growing.")
//   private  - the owner opted this out. Respectful, never a scold.
//   loading  - data is on its way. A calm skeleton, no copy claims.
//
// Voice (carried by every caller): warm, plain, fan-made, sentence case. No
// "simply/just/easy", no exclamation shouting. The caller writes the honest
// line for its surface; this component fixes the shape, tone frame, and box.

export type EmptyVariant = 'empty' | 'growing' | 'private' | 'loading';

export function EmptyState({ variant = 'empty', headline, body, cta, className }: {
  variant?: EmptyVariant;
  /** Sentence case. Required except for `loading`. */
  headline?: string;
  /** One honest line about what lives here (or will). */
  body?: string;
  /** Optional invitation (a link/button). Never on `private` or `loading`. */
  cta?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const box: React.CSSProperties = {
    borderColor: 'var(--verse-line)',
    background: variant === 'private' ? 'transparent' : 'var(--verse-soft)',
  };

  if (variant === 'loading') {
    return (
      <div className={`verse-empty rounded-xl border border-dashed p-6${className ? ` ${className}` : ''}`} style={box} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <div className="animate-pulse space-y-2" aria-hidden>
          <div className="h-3 w-2/5 rounded" style={{ background: 'var(--verse-soft-strong)' }} />
          <div className="h-2.5 w-3/5 rounded" style={{ background: 'var(--verse-soft-strong)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`verse-empty rounded-xl border border-dashed p-6${className ? ` ${className}` : ''}`} style={box}>
      {headline ? (
        <p className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{headline}</p>
      ) : null}
      {body ? (
        <p className="mt-1 max-w-[52ch] text-sm text-secondary">{body}</p>
      ) : null}
      {cta && variant !== 'private' ? <div className="mt-3">{cta}</div> : null}
    </div>
  );
}
