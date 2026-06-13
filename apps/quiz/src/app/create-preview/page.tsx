import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { CreateFunnelPreview, type FunnelGroup } from '@/components/create-preview/create-funnel-preview';

import type { Metadata } from 'next';

// Step H wired funnel (H1-H4). Lives at /create-preview until the H10 swap.
export const metadata: Metadata = {
  title: 'Create a quiz',
  robots: { index: false, follow: false },
};

export default async function CreatePreviewPage(): Promise<React.ReactElement> {
  const groups = await safeFetch(getAllGroups(), [], '[create-preview] groups');
  const funnelGroups: FunnelGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    display_color: g.display_color,
    text_color: g.text_color,
    logo_url: g.logo_url ?? null,
    fandom_name: g.fandom_name ?? 'fan',
  }));

  return <CreateFunnelPreview groups={funnelGroups} />;
}
