// V-POLISH-2 Part A1 - THE PAGE GRAMMAR. One header shape for every Verse
// surface: kicker (what kind of page this is), H1, a one-line dek stating the
// page's scope honestly, and an optional "how to use this page" box for
// complex surfaces (indexes, tools). Grammar is orientation: a reader who
// lands anywhere knows what they are looking at in one glance.

export function PageGrammar({ kicker, title, dek, howToUse }: {
  kicker: string;
  title: React.ReactNode;
  /** One line, honest scope: what this page holds TODAY. */
  dek?: React.ReactNode;
  /** For complex surfaces only: 1-2 short sentences on how to work the page. */
  howToUse?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="v-module">
      <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>{kicker}</p>
      <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
        {title}
      </h1>
      {dek ? <p className="mt-2 max-w-[66ch] text-sm text-secondary">{dek}</p> : null}
      {howToUse ? (
        <p className="mt-3 max-w-[66ch] rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed text-tertiary" style={{ borderColor: 'var(--v-hairline)' }}>
          {howToUse}
        </p>
      ) : null}
    </header>
  );
}
