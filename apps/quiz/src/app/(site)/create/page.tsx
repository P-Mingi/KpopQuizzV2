import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { CreateFunnel, type FunnelGroup } from '@/components/create/create-funnel';

import type { Metadata } from 'next';

// H10: /create IS the creation funnel now (the old editor was retired). Anyone
// can start building without an account; auth is only required at publish, and
// the in-progress draft survives the OAuth round-trip so nothing is lost.
export const metadata: Metadata = {
  title: 'Create a quiz',
  description: 'Create a K-pop quiz in minutes and challenge your fandom.',
  // The creation tool is not indexable content.
  robots: { index: false, follow: true },
};

interface CreatePageProps {
  // H10: /create?group=<slug> pre-selects a group on Screen 1 (deep-link entry).
  searchParams: Promise<{ group?: string }>;
}

export default async function CreatePage({ searchParams }: CreatePageProps): Promise<React.ReactElement> {
  const { group } = await searchParams;
  const groups = await safeFetch(getAllGroups(), [], '[create] groups');
  const funnelGroups: FunnelGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    display_color: g.display_color,
    text_color: g.text_color,
    logo_url: g.logo_url ?? null,
    fandom_name: g.fandom_name ?? 'fan',
  }));

  return <CreateFunnel groups={funnelGroups} initialGroupSlug={group ?? null} />;
}
