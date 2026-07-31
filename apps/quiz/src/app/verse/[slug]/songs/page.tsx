import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { createPublicReadClient } from '@/lib/supabase/server';
import { DeckFilter } from '@/components/verse/pages/deck-filter';

import type { Metadata } from 'next';

export const revalidate = 3600;

// V-PAGES step 6 - the SONG DECK (the Paldeck moment): every catalogued track,
// server-rendered in full (the truth is in the HTML), client-enhanced with
// facet chips + search-within + live counts. Facets are album and year only:
// the is_title_track column is unreliable (recorded law), so no title-track
// facet ships until the data does. The on-page count states what we hold
// ("N tracks catalogued"), and the title carries NO number (the honesty rule:
// we cannot prove catalog completeness, so we do not claim it).

interface DeckTrack { title: string; album: string; albumSlug: string; year: string; linked: boolean }

async function loadTracks(albumIds: number[]): Promise<{ album_id: number; title: string; song_id: number | null }[]> {
  const db = createPublicReadClient();
  const out: { album_id: number; title: string; song_id: number | null }[] = [];
  // The .select() 1000-row cap is real (recorded law): page with .range until short.
  for (let page = 0; page < 5; page++) {
    const { data } = await db.from('album_tracks')
      .select('album_id, title, song_id')
      .in('album_id', albumIds)
      .order('album_id').order('position')
      .range(page * 1000, page * 1000 + 999);
    const rows = (data ?? []) as { album_id: number; title: string; song_id: number | null }[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Songs' };
  const title = `${space.group.name} songs · the ${space.group.fandom_name} song deck`;
  return {
    title: { absolute: title },
    description: `Every catalogued ${space.group.name} track: browse by album and year, search within the list. Fan-built on open data.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${space.group.slug}/songs` },
  };
}

export default async function SongDeckPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const albums = space.albums.filter((a) => a.release_date);
  const albumById = new Map(albums.map((a) => [a.id, a]));
  const rows = albums.length ? await loadTracks(albums.map((a) => a.id)) : [];

  const tracks: DeckTrack[] = rows.map((r) => {
    const a = albumById.get(r.album_id);
    return {
      title: r.title, album: a?.title ?? 'Unknown', albumSlug: a?.slug ?? '',
      year: a?.release_date?.slice(0, 4) ?? '', linked: r.song_id != null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${space.group.slug}` }, { label: 'Songs' }]} />
      </div>

      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>Song deck</p>
        <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
          {space.group.name} songs
        </h1>
        {tracks.length > 0 ? <p className="mt-2 text-sm text-tertiary">{tracks.length.toLocaleString('en-US')} tracks catalogued · from open, sourced release data</p> : null}
      </header>

      {tracks.length === 0 ? (
        <p className="v-module text-sm text-tertiary">No tracks catalogued yet.</p>
      ) : (
        <>
          <DeckFilter scopeId="song-deck" facets={[{ key: 'year', label: 'Year' }, { key: 'album', label: 'Album' }]} />
          <ul id="song-deck" className="v-module" style={{ maxWidth: '52rem' }}>
            {tracks.map((t, i) => (
              <li key={`${t.album}-${t.title}-${i}`} data-deck-item data-f-year={t.year} data-f-album={t.album} data-search={`${t.title} ${t.album}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t py-2" style={{ borderColor: 'var(--v-hairline)' }}>
                <span className="min-w-0 flex-1 text-[14.5px] font-semibold" style={{ color: 'var(--verse-ink)' }}>{t.title}</span>
                {t.albumSlug ? (
                  <Link href={`/verse/${space.group.slug}/albums/${t.albumSlug}`} className="text-[12px] text-tertiary no-underline hover:text-secondary">{t.album}</Link>
                ) : <span className="text-[12px] text-tertiary">{t.album}</span>}
                <span className="text-[12px] tabular-nums text-tertiary">{t.year}</span>
                {t.linked ? (
                  <Link href={`/blindtest/group-${space.group.slug}`} className="text-[12px] font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Play</Link>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
