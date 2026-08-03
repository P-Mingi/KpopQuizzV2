import { notFound } from 'next/navigation';

import { NameThemAllPlayer } from '@/components/game/name-them-all-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { NAME_THEM_ALL_PLAYLISTS, getNameThemAllPlaylist } from '@/lib/games/name-them-all';
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
  return NAME_THEM_ALL_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  const count = (await getNameThemAllItems(slug)).length;
  const title = count > 0 ? playlist.seoTitle.replace('{n}', String(count)) : playlist.title;

  return {
    title,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/name-them-all/${slug}`,
      images: gameOgImages('name-them-all'),
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

  const intro = `${playlist.blurb} There are ${items.length} real K-pop ${playlist.itemNoun} to name before the timer runs out. Spelling is matched loosely, so punctuation-heavy names like (G)I-DLE and f(x) still count. Free and no sign-up.`;

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
      <section className="nta-wrap game-intro" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Name Them All', href: '/games/name-them-all' },
            { label: playlist.title },
          ]}
        />
        <h1 className="game-intro-h1">{playlist.title}</h1>
        <p className="game-intro-p">{intro}</p>
      </section>
      <NameThemAllPlayer playlist={playlist} items={items} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
