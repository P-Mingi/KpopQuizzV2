import Link from 'next/link';

// W2b PART C1 - "N fans left an unbeaten run on <group>".
//
// The whole point of PART C: the opponents already exist (about 869 open runs
// site-wide, from 541 distinct real people). They were simply invisible. This block
// surfaces the REAL count for one group and hands the reader one tap to take one.
//
// COVENANT: the count is passed in from a live paginated query. It is never rounded,
// never floored to look busier, and never invented. At zero this renders NOTHING
// rather than an empty-state advertising a door that leads nowhere (min-gate).
export function OpenRunsBlock({
  subject,
  count,
  href,
  cta = 'Take one',
}: {
  /** What the runs are on: a group name, or "this quiz". */
  subject: string;
  count: number;
  href: string;
  cta?: string;
}): React.ReactElement | null {
  if (count < 1) return null;

  return (
    <section className="open-runs" aria-label={`Open battles ${subject}`}>
      <p className="open-runs-line">
        <strong>{count === 1 ? '1 fan' : `${count} fans`}</strong>{' '}
        {count === 1 ? 'left an unbeaten run' : 'left unbeaten runs'} on {subject}.
      </p>
      <p className="open-runs-sub">
        Real runs people already played. Beat one whenever you like, they do not have to be online.
      </p>
      <Link className="open-runs-cta" href={href}>{cta}</Link>
    </section>
  );
}
