// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/groups/page.tsx, rows 2: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
// Lot (e) part 2 (E1a): the list is the anime site's own (lib/anime/directory.ts, every read through forSite), no longer
// the kpop groups.
import Link from 'next/link';

import { alphaKey } from '@/lib/db/queries/group-directory';
import { getSeriesDirectory } from '@/lib/anime/directory';
import { SeriesArt } from '@/components/anime/series-art';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import { UX_V1 } from '@/lib/ux-v1';
import { GroupsIndexV11 } from '@/components/group/ux-v1/groups-index';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { SITE_ID } from '@/lib/site/registry';

import type { Metadata } from 'next';
import type { DirectoryGroup } from '@/lib/db/queries/group-directory';

export const revalidate = 3600;

// The root layout already appends the site name to the title, so the suffix must NOT be repeated
// here (it renders doubled otherwise, and check:metadata-dupes catches it).
export const metadata: Metadata = {
  title: 'All anime Series',
  description:
    'Every anime series with quizzes on OtakuQuiz, listed A to Z. Browse the full list and jump straight to a series to play.',
  alternates: { canonical: '/series' },
  openGraph: {
    title: 'All anime Series | OtakuQuiz',
    description: 'Browse every anime series with quizzes, A to Z.',
    url: '/series',
    siteName: 'OtakuQuiz',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
};

function SeriesRow({ row }: { row: DirectoryGroup }): React.ReactElement {
  const { group, quizzes } = row;
  return (
    <li className="gdir-item">
      <Link href={`/${group.slug}-quiz`} className="gdir-card">
        <span className="anime-o2-art-row" aria-hidden="true"><SeriesArt slug={group.slug} title={group.name} size="avatar" /></span>
        <span className="gdir-text">
          <span className="gdir-name">{group.name}</span>
          <span className="gdir-meta anime-c1-quiet anime-o2-art-meta">
            {quizzes} {quizzes === 1 ? 'quiz' : 'quizzes'}
            {group.total_plays > 0 && <> · {formatCount(group.total_plays)} plays</>}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function SeriesDirectoryPage(): Promise<React.ReactElement> {
  // UX v11 index: its loader reads the kpop group list, so it stays kpop's (this page is only ever served by the anime
  // build: the (anime) layout answers 404 elsewhere). The anime list is the one below.
  if (UX_V1 && SITE_ID === 'kpop') return GroupsIndexV11();

  const rows = await safeFetch(
    getSeriesDirectory(),
    [] as DirectoryGroup[],
    '[series-directory] getSeriesDirectory',
  );

  // A to Z. Letters with no series simply do not appear.
  const letters = new Map<string, DirectoryGroup[]>();
  for (const row of rows) {
    const k = alphaKey(row.group.name);
    letters.set(k, [...(letters.get(k) ?? []), row]);
  }
  const letterKeys = [...letters.keys()].sort((a, b) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b),
  );

  return (
    <div className="gdir">
      <div className="anime-c1-crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'All series' }]} /></div>

      <header className="gdir-head">
        <h1 className="gdir-title">All anime series</h1>
        <p className="gdir-intro">
          Every series with at least one quiz on OtakuQuiz. {rows.length} series, A to Z, each
          with its number of quizzes.
        </p>
      </header>

      {rows.length === 0 ? (
        // Fail-soft: say the list could not load rather than render an empty page that
        // reads as "this site has no series".
        <p className="gdir-empty">The series list could not be loaded right now.</p>
      ) : (
        <>
          <nav className="gdir-jump" aria-label="Jump to letter">
            {letterKeys.map(l => (
              <a key={l} href={`#letter-${l === '#' ? 'other' : l}`} className="gdir-jump-link">
                {l}
              </a>
            ))}
          </nav>

          {letterKeys.map(l => (
            <section key={l} className="gdir-letter-block" aria-labelledby={`letter-${l === '#' ? 'other' : l}`}>
              <h2 id={`letter-${l === '#' ? 'other' : l}`} className="gdir-letter">{l}</h2>
              <ul className="gdir-grid">
                {letters.get(l)!.map(row => <SeriesRow key={row.group.id} row={row} />)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
