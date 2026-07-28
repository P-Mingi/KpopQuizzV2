import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { getVerseDirectory } from '@/lib/verse/space-data';
import { verseScopeStyle } from '@/lib/verse/theme';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { SpaceTile } from '@/lib/verse/space-data';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const title = 'Verse - K-pop fandom spaces';
  const description = 'Every fandom has a home: group knowledge, members, discography and community, run by fans and built on open, sourced data.';
  return {
    title,
    description,
    alternates: { canonical: 'https://kpopquiz.org/verse' },
    openGraph: { title, description, url: 'https://kpopquiz.org/verse', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function SpaceCard({ tile }: { tile: SpaceTile }): React.ReactElement {
  return (
    <Link
      href={`/verse/${tile.slug}`}
      className="verse-tile verse-scope group relative flex flex-col overflow-hidden rounded-2xl border border-default bg-surface no-underline"
      style={verseScopeStyle(tile)}
      aria-label={`${tile.fandom_name}, home of ${tile.name} fans`}
    >
      <div
        className="relative h-24 w-full"
        style={{ background: 'linear-gradient(135deg, var(--verse-soft-strong), var(--verse-soft))' }}
      >
        {tile.is_launch ? (
          <span
            className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}
          >Launch space</span>
        ) : null}
        <div className="absolute -bottom-6 left-5">
          <GroupLogo
            groupName={tile.name}
            logoUrl={tile.logo_url}
            displayColor={tile.display_color ?? '#E8457A'}
            textColor={tile.text_color ?? '#ffffff'}
            size={52}
          />
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

export default async function VerseDirectoryPage(): Promise<React.ReactElement> {
  const tiles = await safeFetch(getVerseDirectory(), [], 'verse-directory');
  const launch = tiles.filter((t) => t.is_launch);
  const rest = tiles.filter((t) => !t.is_launch);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">Verse</p>
        <h1 className="text-3xl font-extrabold leading-tight text-primary sm:text-4xl">Your fandom&apos;s home on the open web</h1>
        <p className="mt-3 text-base leading-relaxed text-secondary">
          Every K-pop fandom gets a space: the group&apos;s members, discography, eras and community,
          built on open sourced data and run by fans. Clean, fast, and credited to the people who build it.
        </p>
      </header>

      {tiles.length === 0 ? (
        <p className="rounded-xl border border-default bg-surface px-5 py-8 text-center text-secondary">
          Spaces are being prepared. Check back soon.
        </p>
      ) : (
        <>
          {launch.length > 0 ? (
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-tertiary">Launch spaces</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {launch.map((t) => <SpaceCard key={t.group_id} tile={t} />)}
              </div>
            </section>
          ) : null}
          <section>
            {launch.length > 0 ? <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-tertiary">All spaces</h2> : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((t) => <SpaceCard key={t.group_id} tile={t} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
