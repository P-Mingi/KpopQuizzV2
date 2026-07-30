import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { VerseSearch } from '@/components/verse/verse-search';
import { OrbitLockup } from '@/components/verse/brand/verse-wordmarks';
import { getVerseDirectory } from '@/lib/verse/space-data';
import { getTrending } from '@/lib/verse/discovery';
import { verseScopeStyle } from '@/lib/verse/theme';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { SpaceTile } from '@/lib/verse/space-data';

export const revalidate = 3600;

// V-HOME min-gate floors. "The numbers" gates on the CATALOG's impressiveness
// (ingestion-backed idols + releases), never on space existence. The configured-
// spaces figure is intentionally OMITTED until real curated spaces clear a floor
// of 10 (today ~5 verse_spaces rows, none with a confirmed human curator); the
// "18 groups with seeded data" is an ingestion fact, not a configured-spaces claim,
// so it is not stated as one.
const CATALOG_FLOOR = 100; // releases catalogued before "the numbers" is worth stating
const CURATED_SPACES_FLOOR = 10; // real curated spaces before a spaces figure earns a spot
const TRENDING_FLOOR = 3; // ranked fandoms (real quiz plays) before "trending" shows

export function generateMetadata(): Metadata {
  const description = 'Every K-pop fandom gets a home: members, discography, eras, collections and community, fan-built on open sourced data. Find your fandom and start building.';
  return {
    title: { absolute: 'KpopVerse · where fans build their fandom’s home' },
    description,
    alternates: { canonical: 'https://kpopquiz.org/verse' },
    openGraph: { title: 'KpopVerse', description, url: 'https://kpopquiz.org/verse', type: 'website', siteName: 'KpopVerse', images: [{ url: '/api/og/verse', width: 1200, height: 630, alt: 'KpopVerse' }] },
    twitter: { card: 'summary_large_image', title: 'KpopVerse', description, images: ['/api/og/verse'] },
  };
}

const VIOLET = '#7c5cfc';

function SpaceCard({ tile }: { tile: SpaceTile }): React.ReactElement {
  return (
    <Link href={`/verse/${tile.slug}`} className="verse-tile verse-scope group relative flex flex-col overflow-hidden rounded-2xl border border-default bg-surface no-underline"
      style={verseScopeStyle(tile)} aria-label={`${tile.fandom_name}, home of ${tile.name} fans`}>
      <div className="relative h-24 w-full" style={{ background: 'linear-gradient(135deg, var(--verse-soft-strong), var(--verse-soft))' }}>
        {tile.is_launch ? (
          <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Launch space</span>
        ) : null}
        <div className="absolute -bottom-6 left-5">
          <GroupLogo groupName={tile.name} logoUrl={tile.logo_url} displayColor={tile.display_color ?? '#E8457A'} textColor={tile.text_color ?? '#ffffff'} size={52} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-5 pb-4 pt-8">
        <span className="text-lg font-extrabold leading-tight" style={{ color: 'var(--verse-ink)' }}>{tile.fandom_name}</span>
        <span className="text-xs text-secondary">Home of {tile.name} fans</span>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-tertiary">
          <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--verse-soft)' }}>{tile.memberCount} members</span>
          {tile.albumCount > 0 ? <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--verse-soft)' }}>{tile.albumCount} releases</span> : null}
        </div>
      </div>
    </Link>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }): React.ReactElement {
  return <h2 className="v-eyebrow" style={{ marginBottom: '1rem' }}>{children}</h2>;
}

export default async function VerseHomePage(): Promise<React.ReactElement> {
  const [tiles, trending] = await Promise.all([
    safeFetch(getVerseDirectory(), [], 'verse-directory'),
    safeFetch(getTrending(8), [], 'verse-trending'),
  ]);
  const launch = tiles.filter((t) => t.is_launch);
  const rest = tiles.filter((t) => !t.is_launch);
  const bySlug = new Map(tiles.map((t) => [t.slug, t] as const));
  const trendingTiles = trending.map((g) => bySlug.get(g.slug)).filter((t): t is SpaceTile => !!t);

  // THE NUMBERS - ingestion-backed and real. idols = active idols across the
  // documented fandoms; releases = their catalogued albums. The spaces figure is
  // the count of real launch-grade curated spaces, shown only above the floor.
  const totalIdols = tiles.reduce((n, t) => n + t.memberCount, 0);
  const totalReleases = tiles.reduce((n, t) => n + t.albumCount, 0);
  const curatedSpaces = tiles.filter((t) => t.is_launch).length;
  const showNumbers = totalReleases >= CATALOG_FLOOR;

  // CollectionPage + SearchAction JSON-LD (the /verse SEO surface).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'KpopVerse',
    description: 'Fan-built home pages for every K-pop fandom.',
    url: 'https://kpopquiz.org/verse',
    isPartOf: { '@type': 'WebSite', name: 'kpopquiz.org', url: 'https://kpopquiz.org', potentialAction: { '@type': 'SearchAction', target: 'https://kpopquiz.org/search?q={query}', 'query-input': 'required name=query' } },
  };

  return (
    <div className="verse-scope mx-auto w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 1. HERO - identity moment + search-first */}
      <header className="mb-12 sm:mb-16">
        <div className="mb-5"><OrbitLockup height={26} color="var(--text-primary)" /></div>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl">
          Fans build their fandom&rsquo;s <span style={{ color: VIOLET }}>home</span> here
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
          Every K-pop fandom gets a space: members, discography, eras, collections and community, fan-built on open sourced data and credited to the people who make it.
        </p>
        <div className="mt-7 max-w-2xl">
          <VerseSearch />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link href="/verse/random" className="font-semibold no-underline hover:underline" style={{ color: VIOLET }}>Surprise me</Link>
            <Link href="/verse/tags" className="text-secondary no-underline hover:text-primary">Browse by category</Link>
            {trending.length > 0 ? (
              <span className="flex flex-wrap items-center gap-x-3 text-secondary">
                <span className="text-tertiary">Trending:</span>
                {trending.slice(0, 4).map((g) => <Link key={g.slug} href={`/verse/${g.slug}`} className="no-underline hover:text-primary">{g.name}</Link>)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* 2. THE NUMBERS - real counts, min-gated */}
      {showNumbers ? (
        <section className="mb-14 flex flex-wrap gap-x-12 gap-y-4 border-y py-6" style={{ borderColor: 'var(--v-hairline)' }}>
          {[
            { n: totalIdols, l: 'idols documented' },
            { n: totalReleases, l: 'releases catalogued' },
            ...(curatedSpaces >= CURATED_SPACES_FLOOR ? [{ n: curatedSpaces, l: 'curated spaces' }] : []),
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl font-extrabold leading-none tabular-nums text-primary sm:text-4xl">{s.n.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-tertiary">{s.l}</div>
            </div>
          ))}
        </section>
      ) : null}

      {/* 3. TRENDING SPACES - real quiz plays, min-gated */}
      {trendingTiles.length >= TRENDING_FLOOR ? (
        <section className="mb-14">
          <SectionEyebrow>Trending fandoms</SectionEyebrow>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingTiles.slice(0, 6).map((t) => <SpaceCard key={t.group_id} tile={t} />)}
          </div>
        </section>
      ) : null}

      {/* 4. FEATURED SPACE and 5. NEWEST are min-gated OFF until real curators /
          real published activity exist (no fake "featured by", no empty strip). */}

      {/* 6. BROWSE THE FANDOMS - the directory */}
      {tiles.length === 0 ? (
        <p className="rounded-xl border border-default bg-surface px-5 py-8 text-center text-secondary">Spaces are being prepared. Check back soon.</p>
      ) : (
        <>
          {launch.length > 0 ? (
            <section className="mb-12">
              <SectionEyebrow>Launch spaces</SectionEyebrow>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{launch.map((t) => <SpaceCard key={t.group_id} tile={t} />)}</div>
            </section>
          ) : null}
          <section className="mb-14">
            <SectionEyebrow>{launch.length > 0 ? 'All fandoms' : 'Fandoms'}</SectionEyebrow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{rest.map((t) => <SpaceCard key={t.group_id} tile={t} />)}</div>
          </section>
        </>
      )}

      {/* 7. CLAIM YOUR FANDOM - the standing recruitment invitation */}
      <section className="mb-14 rounded-2xl px-6 py-10 sm:px-10" style={{ background: 'color-mix(in srgb, #7c5cfc 12%, var(--bg-surface))', border: '1px solid color-mix(in srgb, #7c5cfc 22%, transparent)' }}>
        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: VIOLET }}>Claim your fandom</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight text-primary sm:text-3xl">Run your fandom&rsquo;s home. Get credited for it.</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-secondary">
          Curators shape a space: what it says, how it looks, what the community builds. You own your work and your name is on it. No gatekeepers, no scraping, just the fandom done right.
        </p>
        <Link href="/login?returnTo=%2Fverse" className="mt-6 inline-flex min-h-[44px] items-center rounded-xl px-6 text-sm font-bold no-underline" style={{ background: VIOLET, color: '#fff' }}>Become a curator</Link>
      </section>

      {/* 8. START HERE + one games funnel, last before the footer */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
          <p className="v-eyebrow" style={{ margin: 0 }}>New to K-pop?</p>
          <p className="mt-2 text-base leading-relaxed text-secondary">Start with the fandoms, or browse by category. Guided starter paths are coming.</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            <Link href="/verse/tags" className="no-underline hover:underline" style={{ color: VIOLET }}>Browse by category</Link>
            <Link href="/verse/random" className="text-secondary no-underline hover:text-primary">Surprise me</Link>
          </div>
        </div>
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
          <p className="v-eyebrow" style={{ margin: 0 }}>Know your bias?</p>
          <p className="mt-2 text-base leading-relaxed text-secondary">Test it. Thousands of fan-made K-pop quizzes and games on the Play side.</p>
          <Link href="/quizzes" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold no-underline text-primary hover:underline">
            Play K-pop quizzes
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
