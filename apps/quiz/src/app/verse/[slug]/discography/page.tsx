import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';

import type { Metadata } from 'next';
import type { SpaceAlbum } from '@/lib/verse/space';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Discography' };
  return { title: `${space.group.name} discography - ${space.group.fandom_name}`, description: `${space.counts.albums} releases by ${space.group.name}: albums, EPs and singles with tracklists.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/discography` } };
}

function AlbumGrid({ albums, slug }: { albums: SpaceAlbum[]; slug: string }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {albums.map((a) => (
        <Link key={a.id} href={`/verse/${slug}/albums/${a.slug}`} className="verse-tile flex flex-col rounded-xl border border-default bg-surface p-3 no-underline" style={{ borderColor: 'var(--verse-line)' }}>
          <span className="line-clamp-2 text-sm font-semibold" style={{ color: 'var(--verse-ink)' }}>{a.title}</span>
          <span className="mt-auto pt-2 text-xs text-tertiary">
            {a.release_date?.slice(0, 4) ?? 'TBA'}
            {a.region !== 'kr' ? <span className="ml-1 rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{a.region}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function DiscographyPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { albums, group } = space;
  if (!albums.length) {
    return <p className="rounded-xl border border-dashed border-default px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>Discography for {group.name} is being prepared.</p>;
  }
  const groups: { key: string; label: string; items: SpaceAlbum[] }[] = [
    { key: 'album', label: 'Albums', items: albums.filter((a) => a.type === 'album') },
    { key: 'ep', label: 'EPs', items: albums.filter((a) => a.type === 'ep') },
    { key: 'single', label: 'Singles', items: albums.filter((a) => a.type === 'single') },
  ].filter((g) => g.items.length);

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>{g.label} <span className="text-tertiary">({g.items.length})</span></h2>
          <AlbumGrid albums={g.items} slug={slug} />
        </section>
      ))}
    </div>
  );
}
