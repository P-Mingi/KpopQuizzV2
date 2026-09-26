import { UxPage } from '@/components/ux-v1/page';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { getGroupsDirectoryIndex } from '@/lib/ux-v1/p3/data';
import { directoryGenLine, directoryIntro, mostPlayed } from '@/lib/ux-v1/p3/model';
import { READ_FAILED, failClosed, read } from '@/lib/ux-v1/p3/reads';

import { GroupsBrowserLoader } from './loader';

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
 * open the empty hub). Fail closed: a failed read is never cached (reads.ts).
 */
export async function GroupsIndexV11(): Promise<React.ReactElement> {
  const index = await read(getGroupsDirectoryIndex(), '[groups v11] getGroupsDirectoryIndex');
  await failClosed('/groups', index === READ_FAILED ? ['getGroupsDirectoryIndex'] : []);

  // Reached with READ_FAILED only in a degraded `next build` prerender (60 s).
  const ok = index !== READ_FAILED;
  const groups = ok ? index.groups : [];
  const genLine = ok ? directoryGenLine(index.directory) : null;

  return (
    <UxPage width="wide" className="p3 p3-groups">
      {jsonLdScript(BREADCRUMB_JSONLD)}
      <header className="ux-ph">
        <h1>All K-pop groups</h1>
        {ok ? <p>{directoryIntro(index.directory)}</p> : null}
        {genLine ? <p className="p3-genline">{genLine}</p> : null}
      </header>

      {groups.length === 0 ? (
        <p className="ux-empty">The group list could not be loaded right now.</p>
      ) : (
        <GroupsBrowserLoader groups={groups} top={mostPlayed(groups)} />
      )}
    </UxPage>
  );
}
