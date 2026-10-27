// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/groups/page.tsx, rows H-7: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import Link from 'next/link';

import { getDirectoryGroups, alphaKey } from '@/lib/db/queries/group-directory';
import { GroupLogo } from '@/components/ui/group-logo';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import { UX_V1 } from '@/lib/ux-v1';
import { GroupsIndexV11 } from '@/components/group/ux-v1/groups-index';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';
import type { DirectoryGroup } from '@/lib/db/queries/group-directory';

export const revalidate = 3600;

// The layout of the site appends its own name to the title, so the suffix must NOT be repeated
// here (it renders doubled otherwise, and check:metadata-dupes catches it).
// Run O1: the hub's own name and origin (registry), noindex and nofollow as routes.md says of /directory.
export const metadata: Metadata = {
  title: 'All groups',
  description: `Every group with quizzes on ${SITE.brand.name}, listed A to Z with its generation. Browse the full list and jump straight to a group to play.`,
  alternates: { canonical: '/directory' },
  robots: { index: false, follow: false },
  openGraph: {
    title: `All groups | ${SITE.brand.name}`,
    description: 'Browse every group with quizzes, A to Z.',
    url: `${SITE.url}/directory`,
    siteName: SITE.brand.name,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
};

const GENERATION_ORDER = ['1st Gen', '2nd Gen', '3rd Gen', '4th Gen', '5th Gen'];

/** A recorded generation, or null. Never guessed from a debut date or a neighbour. */
function knownGeneration(g: string | null | undefined): string | null {
  const v = (g ?? '').trim();
  return v && GENERATION_ORDER.includes(v) ? v : null;
}

function GroupRow({ row }: { row: DirectoryGroup }): React.ReactElement {
  const { group, quizzes } = row;
  const gen = knownGeneration(group.generation);
  return (
    <li className="gdir-item">
      <Link href={`/${group.slug}-quiz`} className="gdir-card">
        <GroupLogo
          groupName={group.name}
          logoUrl={group.logo_url}
          displayColor={group.display_color}
          textColor={group.text_color}
          size={40}
        />
        <span className="gdir-text">
          <span className="gdir-name">{group.name}</span>
          <span className="gdir-meta">
            {quizzes} {quizzes === 1 ? 'quiz' : 'quizzes'}
            {group.total_plays > 0 && <> · {formatCount(group.total_plays)} plays</>}
          </span>
        </span>
        {/* Shown only when the generation is actually recorded. A group with no
            generation shows no tag rather than a guessed or filler one. */}
        {gen && <span className="gdir-gen">{gen}</span>}
      </Link>
    </li>
  );
}

export default async function GroupsDirectoryPage(): Promise<React.ReactElement> {
  // UX v11 (NEXT_PUBLIC_UX_V1, default off): same metadata, H1, intro and
  // BreadcrumbList; every group of this list plus the groups without a quiz yet,
  // read fail-closed. Flag off renders exactly the page below.
  if (UX_V1) return GroupsIndexV11();

  const rows = await safeFetch(
    getDirectoryGroups(),
    [] as DirectoryGroup[],
    '[groups-directory] getDirectoryGroups',
  );

  // A to Z. Letters with no group simply do not appear.
  const letters = new Map<string, DirectoryGroup[]>();
  for (const row of rows) {
    const k = alphaKey(row.group.name);
    letters.set(k, [...(letters.get(k) ?? []), row]);
  }
  const letterKeys = [...letters.keys()].sort((a, b) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b),
  );

  // Generation counts for the summary line. Counts only, because every group is
  // already linked once in the A-Z list and linking all 37 a second time would
  // double the page without adding a single new destination.
  const genCounts = GENERATION_ORDER
    .map(g => ({ gen: g, n: rows.filter(r => knownGeneration(r.group.generation) === g).length }))
    .filter(x => x.n > 0);
  const noGen = rows.filter(r => !knownGeneration(r.group.generation)).length;

  return (
    <div className="gdir">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'All groups' }]} />

      <header className="gdir-head">
        <h1 className="gdir-title">All groups</h1>
        <p className="gdir-intro">
          Every group with at least one quiz on {SITE.brand.name}. {rows.length} groups, A to Z, each
          with its number of quizzes and its generation where we have one recorded.
        </p>
        {genCounts.length > 0 && (
          <p className="gdir-genline">
            {genCounts.map(x => `${x.n} ${x.gen}`).join(' · ')}
            {noGen > 0 && ` · ${noGen} with no generation recorded`}
          </p>
        )}
      </header>

      {rows.length === 0 ? (
        // Fail-soft: say the list could not load rather than render an empty page that
        // reads as "this site has no groups".
        <p className="gdir-empty">The group list could not be loaded right now.</p>
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
                {letters.get(l)!.map(row => <GroupRow key={row.group.id} row={row} />)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
