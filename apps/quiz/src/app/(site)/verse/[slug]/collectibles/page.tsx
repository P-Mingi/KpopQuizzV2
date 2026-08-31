import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageGrammar } from '@/components/verse/page-grammar';
import { getSpace } from '@/lib/verse/space';
import { getCollectibleShelf } from '@/lib/verse/collectibles';
import { CollectibleShelf } from '@/components/verse/collectible-shelf';
import { CollectibleCatalogManager } from '@/components/verse/collectible-catalog-manager';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Collectibles' };
  return {
    title: `${space.group.name} shelf: lightsticks and merch`,
    description: `The ${space.group.name} shelf: official lightsticks and merch, sourced, with a private owned and wanted list. Your shelf stays yours.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/collectibles` },
  };
}

// V-CARDS-MAX step 5 - the Collectibles tab IS the shelf: objects standing on a
// display ledge, its own identity distinct from the binder. Catalog shell renders
// from server props; personal own/want and arrangement hydrate for the owner.
export default async function CollectiblesPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const rows = await getCollectibleShelf(space.group.id);
  const count = rows.reduce((n, r) => n + r.items.length, 0);
  return (
    <div>
      <div className="mb-5"><Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Collectibles' }]} /></div>
      <PageGrammar kicker="The shelf" title={`${space.group.name} collectibles`}
        dek={`${count} official item${count === 1 ? '' : 's'}, sourced. Track what you own and want; your shelf is private to you.`} />
      <CollectibleShelf rows={rows} groupId={space.group.id} groupSlug={slug} fandomName={space.group.fandom_name} />
      <CollectibleCatalogManager groupId={space.group.id} />
    </div>
  );
}
