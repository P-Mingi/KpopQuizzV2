import { getAllGroups, getGroupBySlug } from '@/lib/db/queries/groups';
import { getBankItems } from '@/lib/tier-list/bank';
import { parseKind } from '@/lib/tier-list/subject';
import { safeFetch } from '@/lib/error-handling';
import { TierListCreator, type GroupLite } from '@/components/tier-list/tier-list-creator';

import type { Metadata } from 'next';
import type { TierListItem } from '@/lib/tier-list/types';

// The create wizard (CreateSubject -> CreatePool -> the maker). A tool, not an
// indexed page: noindex, not in the sitemap; the canonical entry stays the Hub.
// Dynamic (reads searchParams + the bank), which is fine for a noindex tool. The
// group list feeds step 1; a chosen ?group=&kind= subject server-loads its pool
// so step 2 opens with real items. All ranking + custom uploads are client-side.
export const metadata: Metadata = {
  title: 'Create a tier list',
  robots: { index: false, follow: true },
};

// A lean projection: passing every column of ~900 groups to the client would be
// a heavy payload, and the wizard only needs these fields to search + list.
function toLite(g: { slug: string; name: string; logo_url: string | null; display_color: string; generation?: string | null; is_custom: boolean; needs_review: boolean }): GroupLite {
  return { slug: g.slug, name: g.name, logo: g.logo_url, color: g.display_color || '#E8457A', generation: g.generation ?? null };
}

interface Props { searchParams: Promise<{ group?: string; kind?: string }> }

export default async function CreateTierListPage({ searchParams }: Props): Promise<React.ReactElement> {
  const sp = await searchParams;
  const kind = parseKind(sp.kind);

  const allGroups = await safeFetch(getAllGroups(), [], '[tier-list] create groups');
  const groups: GroupLite[] = (allGroups as Array<Parameters<typeof toLite>[0]>)
    .filter((g) => !g.is_custom && !g.needs_review && g.slug !== 'general-kpop' && Boolean(g.name))
    .map(toLite);

  let initialGroup: { slug: string; name: string } | null = null;
  let initialGroupId: number | null = null;
  let initialPool: TierListItem[] = [];
  if (sp.group && kind !== 'blank') {
    const group = await getGroupBySlug(sp.group);
    if (group) {
      initialGroup = { slug: group.slug, name: group.name };
      initialGroupId = group.id;
      initialPool = await getBankItems(group.id, kind);
    }
  }

  // Key by the subject params so a soft navigation subject -> pool remounts the
  // wizard and its step re-initialises from the new props. The pool -> board step
  // is local state with no navigation, so custom uploads still survive that hop.
  return (
    <TierListCreator
      key={`${sp.group ?? ''}:${sp.kind ?? ''}`}
      groups={groups}
      initialGroup={initialGroup}
      initialGroupId={initialGroupId}
      initialKind={initialGroup ? kind : 'blank'}
      initialPool={initialPool}
    />
  );
}
