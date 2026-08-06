import Link from 'next/link';
import { EmptyState } from '@/components/verse/primitives/empty-state';

import { GroupLogo } from '@/components/ui/group-logo';
import { VerseSearch } from '@/components/verse/verse-search';
import { MySpacesStrip } from '@/components/verse/my-spaces-strip';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { OrbitMarkSmall } from '@/components/verse/brand/verse-wordmarks';
import { getVerseDirectory, getCatalogTotals, getTodayInKpop, getNewestWikiPages, getLatestVerseActivity } from '@/lib/verse/space-data';
import { getTrending } from '@/lib/verse/discovery';
import { verseScopeStyle } from '@/lib/verse/theme';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { SpaceTile } from '@/lib/verse/space-data';

export const revalidate = 3600;

// V-POLISH step 8 (audit item 4) - the V-HOME rebuild per the report's content
// plan: image-led hero, the today strip, flagship row, newest wiki pages, the
// live strip, ONE deduplicated directory, the recruitment band with weight,
// gateway quizzes last. Honest data only; every min-gate preserved.
//
// The ISR bake fix: the directory fetch THROWS on failure now (no safeFetch).
// A background revalidation that throws keeps serving the last good page
// (stale-while-revalidate); only a first-ever render failure hits the error
// boundary. The old baked "Spaces are being prepared" fallback made a fetch
// race look like a dead site for an hour.
const CATALOG_FLOOR = 100;
const CURATED_SPACES_FLOOR = 10;
const TRENDING_FLOOR = 3;

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

const VIOLET = 'var(--verse-accent)';

function SpaceCard({ tile }: { tile: SpaceTile }): React.ReactElement {
  return (
    <Link href={`/verse/${tile.slug}`} className="verse-tile verse-scope group relative flex flex-col overflow-hidden rounded-2xl border border-default bg-surface no-underline"
      style={verseScopeStyle(tile)} aria-label={`${tile.fandom_name}, home of ${tile.name} fans`}>
      <div className="relative h-28 w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--verse-soft-strong), var(--verse-soft))' }}>
        {tile.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tile.photo_url} alt="" loading="lazy" aria-hidden
            className="absolute inset-0 h-full w-full v-portrait opacity-90 transition-opacity group-hover:opacity-100" />
        ) : null}
        {tile.photo_url ? <div className="absolute inset-0" aria-hidden style={{ background: 'linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--bg-surface) 88%, transparent) 96%)' }} /> : null}
        {tile.is_launch ? (
          <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Launch space</span>
        ) : null}
        <div className="absolute -bottom-6 left-5">
          <GroupLogo groupName={tile.name} logoUrl={tile.logo_url} displayColor={tile.display_color ?? 'var(--verse-accent)'} textColor={tile.text_color ?? '#ffffff'} size={52} />
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

export default async function VerseHomePage(): Promise<React.ReactElement> {
  // The directory is the page: it throws instead of baking an empty shell.
  const tiles = await getVerseDirectory();
  const [trending, catalog, today, newest, activity] = await Promise.all([
    safeFetch(getTrending(8), [], 'verse-trending'),
    safeFetch(getCatalogTotals(), { idols: 0, releases: 0 }, 'verse-catalog-totals'),
    safeFetch(getTodayInKpop(6), [], 'verse-today'),
    safeFetch(getNewestWikiPages(4), [], 'verse-newest-pages'),
    safeFetch(getLatestVerseActivity(3), [], 'verse-activity'),
  ]);
  const launch = tiles.filter((t) => t.is_launch);
  const bySlug = new Map(tiles.map((t) => [t.slug, t] as const));
  const trendingTiles = trending.map((g) => bySlug.get(g.slug)).filter((t): t is SpaceTile => !!t);
  const showTrending = trendingTiles.length >= TRENDING_FLOOR;
  // ONE directory: everything not already shown as flagship or trending.
  const shown = new Set<number>([...launch.map((t) => t.group_id), ...(showTrending ? trendingTiles.slice(0, 6).map((t) => t.group_id) : [])]);
  const directory = tiles.filter((t) => !shown.has(t.group_id));
  // The hero mosaic: real member portraits across the directory, launch first.
  const heroPhotos = [...launch, ...tiles.filter((t) => !t.is_launch)]
    .filter((t) => t.photo_url).slice(0, 6);

  const totalIdols = catalog.idols;
  const totalReleases = catalog.releases;
  const curatedSpaces = launch.length;
  const showNumbers = totalReleases >= CATALOG_FLOOR;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'KpopVerse',
    description: 'Fan-built home pages for every K-pop fandom.',
    url: 'https://kpopquiz.org/verse',
    isPartOf: { '@type': 'WebSite', name: 'kpopquiz.org', url: 'https://kpopquiz.org', potentialAction: { '@type': 'SearchAction', target: 'https://kpopquiz.org/search?q={query}', 'query-input': 'required name=query' } },
  };

  return (
    <div className="verse-page verse-scope mx-auto w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 1. HERO - identity + search left, the fandom mosaic right (the audit's
          empty 40% now carries real member portraits, group-tinted). */}
      <header className="mb-10 grid grid-cols-1 items-center gap-10 sm:mb-14 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl">
            Fans build their fandom&rsquo;s <span style={{ color: VIOLET }}>home</span> here
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
            Every K-pop fandom gets a space: members, discography, eras, collections and community, fan-built on open sourced data and credited to the people who make it.
          </p>
          <div className="mt-7 max-w-2xl">
            <VerseSearch />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <Link href="/verse/random" className="font-semibold no-underline hover:underline" style={{ color: 'var(--verse-brand-text)' }}>Surprise me</Link>
              <Link href="/verse/tags" className="text-secondary no-underline hover:text-primary">Browse by category</Link>
              {trending.length > 0 ? (
                <span className="flex flex-wrap items-center gap-x-3 text-secondary">
                  <span className="text-tertiary">Trending:</span>
                  {trending.slice(0, 4).map((g) => <Link key={g.slug} href={`/verse/${g.slug}`} className="no-underline hover:text-primary">{g.name}</Link>)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {heroPhotos.length >= 4 ? (
          <div className="grid grid-cols-3 gap-2.5 max-lg:hidden" aria-hidden>
            {heroPhotos.map((t, i) => (
              <Link key={t.group_id} href={`/verse/${t.slug}`} tabIndex={-1} className={`verse-scope block overflow-hidden rounded-2xl border no-underline ${i % 3 === 1 ? 'translate-y-4' : ''}`}
                style={{ ...verseScopeStyle(t), borderColor: 'var(--verse-line)', aspectRatio: '3 / 4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.photo_url!} alt="" loading="eager" className="h-full w-full v-portrait" />
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <MySpacesStrip />

      {/* 2. TODAY IN K-POP - dates we hold, alive at zero content cost */}
      {today.length > 0 ? (
        <section className="mb-12" aria-label="Today in K-pop">
          <SectionHeader kicker="Today in K-pop" as="h2" />
          <div className="flex flex-wrap gap-2.5">
            {today.map((t) => (
              <Link key={`${t.kind}-${t.label}`} href={t.href} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm no-underline" style={{ borderColor: 'var(--v-hairline)' }}>
                <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
                <span className="text-[12px] text-tertiary">{t.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. THE NUMBERS - real counts, min-gated */}
      {showNumbers ? (
        <section className="mb-12 flex flex-wrap gap-x-12 gap-y-4 border-y py-6" style={{ borderColor: 'var(--v-hairline)' }}>
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

      {/* 4. FLAGSHIP SPACES - the launch row (never repeated below) */}
      {launch.length > 0 ? (
        <section className="mb-12">
          <SectionHeader kicker="Flagship spaces" as="h2" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{launch.map((t) => <SpaceCard key={t.group_id} tile={t} />)}</div>
        </section>
      ) : null}

      {/* 5. TRENDING - real quiz plays, min-gated, deduped from the directory */}
      {showTrending ? (
        <section className="mb-12">
          <SectionHeader kicker="Trending fandoms" as="h2" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingTiles.slice(0, 6).filter((t) => !t.is_launch).map((t) => <SpaceCard key={t.group_id} tile={t} />)}
          </div>
        </section>
      ) : null}

      {/* 6. NEWEST FROM THE WIKI + LIVE FROM THE COMMUNITY - real rows only */}
      {(newest.length > 0 || activity.length > 0) ? (
        <section className="mb-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {newest.length > 0 ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
              <SectionHeader kicker="Newest from the wiki" as="h2" />
              <ul className="flex flex-col gap-2.5">
                {newest.map((p) => (
                  <li key={`${p.groupSlug}-${p.slug}`}>
                    <Link href={`/verse/${p.groupSlug}/wiki/${p.slug}`} className="group flex items-baseline gap-2.5 no-underline">
                      <span className="font-bold group-hover:underline" style={{ color: 'var(--verse-ink)' }}>{p.title}</span>
                      <span className="text-[12px] text-tertiary">{p.fandom}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {activity.length > 0 ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
              <SectionHeader kicker="Live from the community" as="h2" />
              <ul className="flex flex-col gap-2.5">
                {activity.map((a, i) => (
                  <li key={i}>
                    <Link href={a.href} className="group flex items-baseline gap-2.5 no-underline">
                      <span className="font-bold group-hover:underline" style={{ color: 'var(--verse-ink)' }}>{a.label}</span>
                      <span className="text-[12px] text-tertiary">{a.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 7. THE DIRECTORY - the one complete grid, deduped from everything above */}
      {tiles.length === 0 ? (
        <EmptyState headline="No spaces yet." body="Fandom spaces appear here as they open." />
      ) : directory.length > 0 ? (
        <section className="mb-12">
          <SectionHeader kicker="All fandoms" as="h2" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{directory.map((t) => <SpaceCard key={t.group_id} tile={t} />)}</div>
        </section>
      ) : null}

      {/* 8. CLAIM YOUR FANDOM - the recruitment band, now with the ladder in miniature */}
      <section className="mb-12 rounded-2xl px-6 py-10 sm:px-10" style={{ background: 'color-mix(in srgb, var(--verse-accent) 12%, var(--bg-surface))', border: '1px solid color-mix(in srgb, var(--verse-accent) 22%, transparent)' }}>
        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--verse-brand-text)' }}>Claim your fandom</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight text-primary sm:text-3xl">Run your fandom&rsquo;s home. Get credited for it.</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-secondary">
          Curators shape a space: what it says, how it looks, what the community builds. You own your work and your name is on it. No gatekeepers, no scraping, just the fandom done right.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-secondary" aria-label="The path">
          <span><strong className="font-bold text-primary">Join</strong> a space</span>
          <span><strong className="font-bold text-primary">Contribute</strong> at 100 XP</span>
          <span><strong className="font-bold text-primary">Curate</strong> by appointment</span>
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/login?returnTo=%2Fverse" className="inline-flex min-h-[44px] items-center rounded-xl px-6 text-sm font-bold no-underline" style={{ background: VIOLET, color: '#fff' }}>Become a curator</Link>
        </div>
        {/* V-TRUST step 2: the covenant at the moment of deciding. Prominent, always
            shown (no gate), so a recruit reads what we owe them before they build. */}
        <Link href="/verse/promises" className="mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 no-underline transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--verse-accent) 30%, transparent)', background: 'color-mix(in srgb, var(--verse-accent) 6%, var(--bg-surface))' }}>
          <OrbitMarkSmall size={26} />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-primary">Before you build: here is what we promise you</span>
            <span className="block text-xs text-secondary">Our covenant to every fan and curator, in plain words.</span>
          </span>
          <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--verse-brand-text)" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </section>

      {/* 9. START HERE + one games funnel, last before the footer */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
          <SectionHeader kicker="New to K-pop?" />
          <p className="mt-2 text-base leading-relaxed text-secondary">Start with the fandoms, or browse by category. Guided starter paths are coming.</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            <Link href="/verse/tags" className="no-underline hover:underline" style={{ color: 'var(--verse-brand-text)' }}>Browse by category</Link>
            <Link href="/verse/random" className="text-secondary no-underline hover:text-primary">Surprise me</Link>
          </div>
        </div>
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--v-hairline)' }}>
          <SectionHeader kicker="Know your bias?" />
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
