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
  groupName,
  groupSlug,
  count,
}: {
  groupName: string;
  groupSlug: string;
  count: number;
}): React.ReactElement | null {
  if (count < 1) return null;

  return (
    <section className="open-runs" aria-label={`Open ${groupName} battles`}>
      <p className="open-runs-line">
        <strong>{count === 1 ? '1 fan' : `${count} fans`}</strong>{' '}
        {count === 1 ? 'left an unbeaten run' : 'left unbeaten runs'} on {groupName}.
      </p>
      <p className="open-runs-sub">
        Real runs people already played. Beat one whenever you like, they do not have to be online.
      </p>
      <Link
        className="open-runs-cta"
        href={`/battle?group=${groupSlug}&utm_source=group&utm_medium=internal&utm_campaign=open_runs`}
      >
        Take one on
      </Link>
    </section>
  );
}
