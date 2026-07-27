import { notFound } from 'next/navigation';

import { NameThemAllPlayer } from '@/components/game/name-them-all-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { NAME_THEM_ALL_PLAYLISTS, getNameThemAllPlaylist } from '@/lib/games/name-them-all';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return NAME_THEM_ALL_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  return {
    title: playlist.seoTitle,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/name-them-all/${slug}`,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/games/name-them-all/${slug}` },
  };
}

export default async function NameThemAllPlaylistPage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) notFound();

  const items = await safeFetch(getNameThemAllItems(slug), [], '[name-them-all] getItems');
  if (items.length === 0) notFound();

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: playlist.title,
    url: `https://kpopquiz.org/games/name-them-all/${slug}`,
    description: playlist.seoDescription,
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="py-4 md:py-6">
      <div className="nta-wrap" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Name Them All', href: '/games/name-them-all' },
            { label: playlist.title },
          ]}
        />
      </div>
      <NameThemAllPlayer playlist={playlist} items={items} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
