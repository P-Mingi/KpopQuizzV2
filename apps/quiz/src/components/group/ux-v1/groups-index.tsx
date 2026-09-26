import { UxPage } from '@/components/ux-v1/page';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { mostPlayed } from '@/lib/ux-v1/p3/model';

import { GroupsBrowserLoader } from './loader';

import type { DirectoryGroup } from '@/lib/db/queries/group-directory';
import type { IndexGroup } from '@/lib/ux-v1/p3/model';

const GENERATION_ORDER = ['1st Gen', '2nd Gen', '3rd Gen', '4th Gen', '5th Gen'];

function knownGeneration(g: string | null | undefined): string | null {
  const v = (g ?? '').trim();
  return v && GENERATION_ORDER.includes(v) ? v : null;
}

// Today's BreadcrumbList of /groups (Home > All groups), unchanged. The v11 page
// has no visible crumb (prototype #groups), like the v11 blindtest hub.
const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
    { '@type': 'ListItem', position: 2, name: 'All groups' },
  ],
};

interface GroupsIndexProps {
  /** The live directory rows (groups with a published quiz): they write the
   *  SEO-locked intro and generation line exactly as the flag-off page does. */
  rows: DirectoryGroup[];
  /** Every visible group with real counts (lib/ux-v1/p3/data getGroupsIndex). */
  groups: IndexGroup[];
}

/**
 * v11 /groups (prototype #groups, DESIGN-SPEC 16.7 + 17.3). Server component:
 * the page stays Static / ISR. SEO lock: metadata, H1, intro, generation line and
 * BreadcrumbList JSON-LD are today's; every hub link of today's list is here, plus
 * the groups that have no quiz yet (16.7: listed muted, they open the empty hub).
 */
export function GroupsIndexV11({ rows, groups }: GroupsIndexProps): React.ReactElement {
  const genCounts = GENERATION_ORDER
    .map((g) => ({ gen: g, n: rows.filter((r) => knownGeneration(r.group.generation) === g).length }))
    .filter((x) => x.n > 0);
  const noGen = rows.filter((r) => !knownGeneration(r.group.generation)).length;

  return (
    <UxPage width="wide" className="p3 p3-groups">
      {jsonLdScript(BREADCRUMB_JSONLD)}
      <header className="ux-ph">
        <h1>All K-pop groups</h1>
        <p>Every group with at least one quiz on KpopQuiz. {rows.length} groups, A to Z, each with its number of quizzes and its generation where we have one recorded.</p>
        {genCounts.length > 0 ? (
          <p className="p3-genline">
            {genCounts.map((x) => `${x.n} ${x.gen}`).join(' · ')}
            {noGen > 0 && ` · ${noGen} with no generation recorded`}
          </p>
        ) : null}
      </header>

      {groups.length === 0 ? (
        <p className="ux-empty">The group list could not be loaded right now.</p>
      ) : (
        <GroupsBrowserLoader groups={groups} top={mostPlayed(groups)} />
      )}
    </UxPage>
  );
}
