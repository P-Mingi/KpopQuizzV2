import Link from 'next/link';
import { UxPage } from '@/components/ux-v1/page';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { getGroupBySlug } from '@/lib/db/queries/groups';
import { GENERAL_THEMES } from '@/lib/hubs/general-themes';
import { themeCounts } from '@/lib/hubs/theme-view';
import { SITE_ID } from '@/lib/site/registry';
import { getGroupsDirectoryIndex, getHubQuizzes } from '@/lib/ux-v1/p3/data';
import { GENERATIONS_HUB_PATH } from '@/lib/generations/generations';
import { CATCH_ALL_SLUG, directoryGenLine, directoryIntro, mostPlayed } from '@/lib/ux-v1/p3/model';
import { READ_FAILED, failClosed, failedReads, read, readAll } from '@/lib/ux-v1/p3/reads';

import { GroupsBrowserLoader } from './loader';
import { ThemeTopics } from './theme-topics';

import type { HubQuiz } from '@/lib/ux-v1/p3/model';

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

/**
 * v11 /groups (prototype #groups, DESIGN-SPEC 16.7 + 17.3). Server component:
 * the page stays Static / ISR. SEO lock: metadata, H1, intro, generation line and
 * BreadcrumbList JSON-LD are today's (the intro numbers come from the same rows as
 * today's directory: every group with a published quiz); every hub link of today's
 * list is here, plus the groups that have no quiz yet (16.7: listed muted, they
 * open the empty hub). A failed read is tried again, then served degraded for 60 s (reads.ts).
 * On kpop, the General K-pop theme pages follow the list (SEO phase 1, PR 16).
 */
/** The published General K-pop quizzes (the same cached reads as the category hub). */
async function categoryQuizzes(): Promise<HubQuiz[]> {
  const g = await getGroupBySlug(CATCH_ALL_SLUG);
  return g ? getHubQuizzes(g.id) : [];
}

export async function GroupsIndexV11(): Promise<React.ReactElement> {
  // SEO phase 1, PR 16 (owner, 2026-10-28): /groups is the entry to the General K-pop theme pages. Kpop only.
  const { index, category } = await readAll({
    index: () => read(getGroupsDirectoryIndex(), '[groups v11] getGroupsDirectoryIndex'),
    category: () => (SITE_ID === 'kpop' ? read(categoryQuizzes(), '[groups v11] category') : Promise.resolve([] as HubQuiz[])),
  });
  await failClosed('/groups', failedReads({ getGroupsDirectoryIndex: index, category }));

  // READ_FAILED after its retry: the directory is served empty with a 60 s revalidate.
  const ok = index !== READ_FAILED;
  const groups = ok ? index.groups : [];
  const genLine = ok ? directoryGenLine(index.directory) : null;
  // A failed category read hides the topics (the page is served degraded, tried again in 60 s).
  const general = category === READ_FAILED ? [] : category;
  const counts = themeCounts(new Set(general.map((q) => q.slug)));
  const topics = GENERAL_THEMES.filter((t) => (counts.get(t.slug) ?? 0) > 0);

  return (
    <UxPage width="wide" className="p3 p3-groups">
      {jsonLdScript(BREADCRUMB_JSONLD)}
      <header className="ux-ph">
        <h1>All K-pop groups</h1>
        {ok ? <p>{directoryIntro(index.directory)}</p> : null}
        {genLine ? <p className="p3-genline">{genLine}</p> : null}
        {/* SEO Mission 2, part C: the generations hub, linked with its cluster anchor. */}
        <p className="p3-genline">
          <Link href={GENERATIONS_HUB_PATH}>K-pop generations</Link>: which era each group belongs to, with sources.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="ux-empty">The group list could not be loaded right now.</p>
      ) : (
        <GroupsBrowserLoader groups={groups} top={mostPlayed(groups)} />
      )}

      {topics.length > 0 ? (
        <ThemeTopics id="groups-topics-h" topics={topics} counts={counts}>
          <p className="ux-muted">
            No favorite group needed: these quizzes mix every group. All {general.length} are on the{' '}
            <Link href="/general-kpop-quiz">General K-pop quiz</Link> page.
          </p>
        </ThemeTopics>
      ) : null}
    </UxPage>
  );
}
