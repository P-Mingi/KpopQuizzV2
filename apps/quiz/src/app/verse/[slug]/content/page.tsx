import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { getEras } from '@/lib/verse/eras';
import { sceneCounts } from '@/lib/verse/entities';
import { SCENE_LIST } from '@/lib/verse/entity-types';
import { photocardCount } from '@/lib/verse/photocards';
import { collectibleCount } from '@/lib/verse/collectibles';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const revalidate = 3600;

// V-PAGES step 6 - the INDEX OF INDEXES (the router page): category cards with
// live counts + one-liners, every card min-gated on real content (no empty
// doorways, ever). Counts are the trust currency; each number here is the same
// number its destination shows.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Browse' };
  const title = `Browse the ${space.group.fandom_name} home · ${space.group.name} Verse`;
  return {
    title: { absolute: title },
    description: `Everything in the ${space.group.fandom_name} space: members, releases, songs, eras, pages, collections. Real counts, fan-built.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${space.group.slug}/content` },
  };
}

export default async function ContentRouterPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const g = space.group;

  const db = createPublicReadClient();
  const albumIds = space.albums.map((a) => a.id);
  const [eras, scenes, pcCount, colCount, wikiPages, { count: trackCount }] = await Promise.all([
    getEras(g.id), sceneCounts(g.id), photocardCount(g.id), collectibleCount(g.id), listPublishedPages(g.id),
    albumIds.length
      ? db.from('album_tracks').select('id', { count: 'exact', head: true }).in('album_id', albumIds)
      : Promise.resolve({ count: 0 } as { count: number | null }),
  ]);

  const cards: { href: string; label: string; count: number; sub: string }[] = [];
  if (space.counts.members > 0) cards.push({ href: `/verse/${g.slug}/members`, label: 'Members', count: space.counts.members, sub: 'Profiles, positions, facts' });
  if (space.albums.length > 0) cards.push({ href: `/verse/${g.slug}/discography`, label: 'Discography', count: space.albums.length, sub: 'Every release, sourced' });
  if ((trackCount ?? 0) > 0) cards.push({ href: `/verse/${g.slug}/songs`, label: 'Songs', count: trackCount ?? 0, sub: 'The song deck: browse and search' });
  if (eras.length > 0) cards.push({ href: `/verse/${g.slug}/timeline`, label: 'Timeline', count: eras.length, sub: 'The eras, in order' });
  if (wikiPages.length > 0) cards.push({ href: `/verse/${g.slug}/wiki`, label: 'Wiki pages', count: wikiPages.length, sub: 'Fan-built pages with sources' });
  for (const s of SCENE_LIST) {
    const n = scenes[s.kind] ?? 0;
    if (n > 0) cards.push({ href: `/verse/${g.slug}/${s.seg}`, label: s.label, count: n, sub: 'Documented and sourced' });
  }
  if (pcCount > 0) cards.push({ href: `/verse/${g.slug}/photocards`, label: 'Photocards', count: pcCount, sub: 'The catalogued sets' });
  if (colCount > 0) cards.push({ href: `/verse/${g.slug}/collectibles`, label: 'Collectibles', count: colCount, sub: 'Lightsticks and more' });

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${g.slug}` }, { label: 'Browse' }]} />
      </div>

      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>Browse</p>
        <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
          Everything in the {space.group.fandom_name} home
        </h1>
        <p className="mt-2 text-sm text-tertiary" style={{ maxWidth: 'var(--v-measure)' }}>
          <strong className="font-semibold text-secondary">How to use this page:</strong> every card below is a real index with that many entries today. Pick a door.
        </p>
      </header>

      <div className="v-grid-cards v-module">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-2xl border p-4 no-underline transition-colors hover:bg-[var(--verse-soft)]" style={{ borderColor: 'var(--v-hairline)' }}>
            <span className="block text-2xl font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{c.count.toLocaleString('en-US')}</span>
            <span className="mt-1.5 block text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{c.label}</span>
            <span className="mt-0.5 block text-[12.5px] text-tertiary">{c.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
