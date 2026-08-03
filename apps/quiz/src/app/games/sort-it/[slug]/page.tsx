import { notFound } from 'next/navigation';

import { SortItPlayer } from '@/components/game/sort-it-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSortItItems } from '@/lib/db/queries/sort-it';
import { SORT_IT_PLAYLISTS, getSortItPlaylist } from '@/lib/games/sort-it';
import { gameOgImages } from '@/lib/games/game-seo';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  // Build safety: preview/CI builds can run without Supabase env vars, and the
  // page body constructs the service-role client during prerender, which throws
  // "supabaseUrl is required" synchronously (escaping safeFetch) and fails the
  // build. Skip build-time params when the URL is absent; dynamicParams (default)
  // still serves + caches each slug via ISR at runtime, so production is unchanged.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  return SORT_IT_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getSortItPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  // Real count from the same (cached) loader the page uses, so the title's
  // number is honest and updates with the catalog.
  const count = (await getSortItItems(slug)).length;
  const title = count > 0 ? playlist.seoTitle.replace('{n}', String(count)) : playlist.title;

  return {
    title,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/sort-it/${slug}`,
      images: gameOgImages('sort-it'),
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
      <section className="si-wrap" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Sort It', href: '/games/sort-it' },
            { label: playlist.title },
          ]}
        />
      </section>
      <SortItPlayer playlist={playlist} items={items} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
    </div>
  );
}
