import { DoorwayList } from '@/components/verse/pages/doorway-format';

import { attachedPages } from '@/lib/verse/pages/links';
import { getSpaceDoorways } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { resolveDoorway } from '@/lib/verse/presentation/doorways';

// V-PAGES step 4 - the "More about this" zone on entity pages: the custom pages
// whose body references this entity (an album lists its versions page, MV pages,
// photocard set...). Published sources only (requirement 2); renders nothing
// when no page is attached (min-gate: no empty doorway). V-HARMONY-2A step 4:
// the presentation (link/button/card/feature) is the space's doorway config;
// the default is `card`. A custom label overrides the "More about {entity}"
// heading only - the target titles + hrefs are unchanged (the SEO invariant).
export async function MoreAboutThis({ groupId, groupSlug, entityRef, entityLabel }: {
  groupId: number; groupSlug: string; entityRef: string; entityLabel: string;
}): Promise<React.ReactElement | null> {
  const pages = await attachedPages(groupId, entityRef);
  if (pages.length === 0) return null;
  const cfg = resolveDoorway(await getSpaceDoorways(groupId), 'moreAboutThis');
  const items = pages.map((p) => ({
    href: `/verse/${groupSlug}/wiki/${p.slug}`,
    title: p.title,
    sub: getKind(KPOP_PAGE_REGISTRY, p.kind)?.label ?? p.kind,
  }));
  return <DoorwayList heading={cfg.label ?? <>More about {entityLabel}</>} items={items} format={cfg.format} />;
}
