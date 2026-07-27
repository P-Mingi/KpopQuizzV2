import { notFound } from 'next/navigation';

import { SortItPlayer } from '@/components/game/sort-it-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSortItItems } from '@/lib/db/queries/sort-it';
import { SORT_IT_PLAYLISTS, getSortItPlaylist } from '@/lib/games/sort-it';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return SORT_IT_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getSortItPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  return {
    title: playlist.seoTitle,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/sort-it/${slug}`,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/games/sort-it/${slug}` },
  };
}

export default async function SortItPlaylistPage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const playlist = getSortItPlaylist(slug);
  if (!playlist) notFound();

  // Real-data gate: getSortItItems returns [] when the live query is below the
  // minimum, so a thin playlist 404s rather than shipping a padded stack.
  const items = await safeFetch(getSortItItems(slug), [], '[sort-it] getItems');
  if (items.length === 0) notFound();

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: playlist.title,
    url: `https://kpopquiz.org/games/sort-it/${slug}`,
    description: playlist.seoDescription,
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="py-4 md:py-6">
      <div className="si-wrap" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Sort It', href: '/games/sort-it' },
            { label: playlist.title },
          ]}
        />
      </div>
      <SortItPlayer playlist={playlist} items={items} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
    </div>
  );
}
