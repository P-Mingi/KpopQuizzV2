import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageGrammar } from '@/components/verse/page-grammar';
import { CoverArt } from '@/components/verse/cover-art';
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

/* V4 Part 1 item 3 - the discography stops being bare text boxes. Cover art
   leads every card (the catalog is visual or it is nothing), the type and
   region chips are designed marks instead of raw lowercase codes, and the
   groups read as chapters with the hierarchy system. */

const REGION_CHIP: Record<string, { label: string; title: string }> = {
  jp: { label: 'JP', title: 'Japanese release' },
  us: { label: 'US', title: 'US release' },
  en: { label: 'EN', title: 'English release' },
};

function AlbumCard({ a, slug }: { a: SpaceAlbum; slug: string }): React.ReactElement {
  const region = a.region !== 'kr' ? REGION_CHIP[a.region] ?? { label: a.region.toUpperCase(), title: `${a.region.toUpperCase()} release` } : null;
  return (
    <Link href={`/verse/${slug}/albums/${a.slug}`} className="verse-tile group flex flex-col overflow-hidden rounded-xl border border-default bg-surface no-underline" style={{ borderColor: 'var(--verse-line)' }}>
      <div className="relative">
        <CoverArt mbid={a.mbid} title={a.title} className="w-full" />
        {region ? (
          <span title={region.title} className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
            style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>
            {region.label}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: 'var(--verse-ink)' }}>{a.title}</span>
        <span className="mt-auto flex items-center gap-2 pt-1 text-xs text-tertiary">
          <span className="tabular-nums">{a.release_date?.slice(0, 4) ?? 'TBA'}</span>
          <span aria-hidden style={{ color: 'var(--v-hairline)' }}>·</span>
          <span className="uppercase tracking-wide">{a.type}</span>
        </span>
      </div>
    </Link>
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
  const years = albums.map((a) => a.release_date?.slice(0, 4)).filter(Boolean);
  const span = years.length ? `${Math.min(...years.map(Number))} to ${Math.max(...years.map(Number))}` : '';

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: group.fandom_name, href: `/verse/${slug}` }, { label: 'Discography' }]} />
      </div>
      <PageGrammar kicker="Discography" title={`${albums.length} releases`}
        dek={`Every catalogued ${group.name} release${span ? `, ${span}` : ''}. Covers from the Cover Art Archive; every date sourced.`} />
      {groups.map((g) => (
        <section key={g.key} className="mb-10">
          <h2 className="v-section-title">{g.label} <span className="text-lg font-semibold text-tertiary tabular-nums">{g.items.length}</span></h2>
          <div className="v-section-rule" aria-hidden />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {g.items.map((a) => <AlbumCard key={a.id} a={a} slug={slug} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
