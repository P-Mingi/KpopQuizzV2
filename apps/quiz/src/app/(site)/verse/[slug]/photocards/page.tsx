import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageGrammar } from '@/components/verse/page-grammar';
import { getSpace } from '@/lib/verse/space';
import { getPhotocardSets } from '@/lib/verse/photocards';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';
import { PhotocardBinder } from '@/components/verse/photocard-binder';
import { PhotocardCatalogManager } from '@/components/verse/photocard-catalog-manager';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Photocards' };
  return {
    title: `${space.group.name} photocard binder`,
    description: `The ${space.group.name} photocard binder: album, POB and event cards organized by set, with a private owned and wanted checklist. Your collection stays yours.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/photocards` },
  };
}

// V-CARDS-MAX step 2 - the Photocards tab IS the binder. The catalog shell (sets
// and pockets) renders from server props for SEO; the personal own/want state and
// arrangement hydrate for the signed-in owner only (binder views stay private).
export default async function PhotocardsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const sets = await getPhotocardSets(space.group.id);
  const cardCount = sets.reduce((n, s) => n + s.cards.length, 0);
  // Scrapbook stickers draw from the space's existing sticker assets.
  const stickerAssets = space.stickerAssets.map((a) => ({ id: a.id, url: spaceAssetUrl(a.path) })).filter((a): a is { id: number; url: string } => !!a.url);
  return (
    <div>
      <div className="mb-5"><Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Photocards' }]} /></div>
      <PageGrammar kicker="The binder" title={`${space.group.name} photocards`}
        dek={`${cardCount} card${cardCount === 1 ? '' : 's'} across ${sets.length} set${sets.length === 1 ? '' : 's'}, catalogued and sourced. Track what you own and want; your binder is private to you.`} />
      <PhotocardBinder sets={sets} groupId={space.group.id} groupSlug={slug} fandomName={space.group.fandom_name} stickerAssets={stickerAssets} />
      <PhotocardCatalogManager groupId={space.group.id}
        albums={space.albums.map((a) => ({ id: a.id, label: a.title }))}
        idols={space.idols.map((i) => ({ id: i.id, label: i.name }))} />
    </div>
  );
}
