import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { createPublicReadClient } from '@/lib/supabase/server';
import { DeckFilter } from '@/components/verse/pages/deck-filter';
import { CoverArt } from '@/components/verse/cover-art';
import { TrackPlay } from '@/components/verse/track-play';

import type { Metadata } from 'next';

export const revalidate = 3600;

// V-PAGES step 6 - the SONG DECK (the Paldeck moment): every catalogued track,
// server-rendered in full (the truth is in the HTML), client-enhanced with
// facet chips + search-within + live counts. Facets are album and year only:
// the is_title_track column is unreliable (recorded law), so no title-track
// facet ships until the data does. The on-page count states what we hold
// ("N tracks catalogued"), and the title carries NO number (the honesty rule:
// we cannot prove catalog completeness, so we do not claim it).

interface DeckTrack { position: number; title: string; linked: boolean; songId: string | null; youtubeId: string | null; clipStart: number; curatedUrl: string | null }
interface DeckGroup { id: number; album: string; albumSlug: string; year: string; mbid: string | null; tracks: DeckTrack[] }

async function loadTracks(albumIds: number[]): Promise<{ album_id: number; position: number; title: string; song_id: string | null }[]> {
  const db = createPublicReadClient();
  const out: { album_id: number; position: number; title: string; song_id: string | null }[] = [];
  // The .select() 1000-row cap is real (recorded law): page with .range until short.
  for (let page = 0; page < 5; page++) {
    const { data, error } = await db.from('album_tracks')
      .select('album_id, position, title, song_id')
      .in('album_id', albumIds)
      .order('album_id').order('position')
      .range(page * 1000, page * 1000 + 999);
    // ISR bake law: the tracklist IS the deck page; throw instead of baking empty.
    if (error) throw new Error(`loadTracks page ${page}: ${error.message}`);
    const rows = (data ?? []) as { album_id: number; position: number; title: string; song_id: string | null }[];
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
  const rows = albums.length ? await loadTracks(albums.map((a) => a.id)) : [];

  // V-POLISH step 6 (audit item 8): the deck groups by album, newest first,
  // instead of stamping the album name onto all 197 rows. Presentation only;
  // the data was already album-ordered.
  // V4 item 4 - the play sources: the blindtest's YouTube clips by normalized
  // title (the existing legal source), curated official videos by override.
  const db2 = createPublicReadClient();
  const norm = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const songIds = [...new Set(rows.map((r) => r.song_id).filter((x): x is string => !!x))];
  const [{ data: btRows }, { data: ovRows }] = await Promise.all([
    db2.from('blind_test_songs').select('title, youtube_id, clip_chorus').eq('group_id', space.group.id).eq('status', 'active'),
    songIds.length ? db2.from('entity_overrides').select('entity_id, value').eq('entity_type', 'song').eq('field', 'youtube_url').in('entity_id', songIds) : Promise.resolve({ data: [] }),
  ]);
  const btBy = new Map(((btRows ?? []) as { title: string; youtube_id: string | null; clip_chorus: number | null }[]).map((b) => [norm(b.title), b]));
  const curatedBy = new Map(((ovRows ?? []) as { entity_id: string; value: string | null }[]).map((o) => [o.entity_id, o.value]));

  const byAlbum = new Map<number, DeckTrack[]>();
  for (const r of rows) {
    if (!byAlbum.has(r.album_id)) byAlbum.set(r.album_id, []);
    const bt = btBy.get(norm(r.title));
    byAlbum.get(r.album_id)!.push({
      position: r.position, title: r.title, linked: r.song_id != null,
      songId: r.song_id, youtubeId: bt?.youtube_id ?? null, clipStart: bt?.clip_chorus ?? 0,
      curatedUrl: r.song_id ? (curatedBy.get(r.song_id) ?? null) : null,
    });
  }
  const groups: DeckGroup[] = albums
    .filter((a) => byAlbum.has(a.id))
    .map((a) => ({ id: a.id, album: a.title, albumSlug: a.slug, year: a.release_date?.slice(0, 4) ?? '', mbid: a.mbid, tracks: byAlbum.get(a.id)! }));
  const total = groups.reduce((n, g) => n + g.tracks.length, 0);

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
        {total > 0 ? <p className="mt-2 text-sm text-tertiary">{total.toLocaleString('en-US')} tracks · sourced from open release data</p> : null}
      </header>

      {groups.length === 0 ? (
        <p className="v-module text-sm text-tertiary">No tracks catalogued yet.</p>
      ) : (
        <>
          <DeckFilter scopeId="song-deck" facets={[{ key: 'year', label: 'Year', sort: 'value-desc' }, { key: 'album', label: 'Album' }]} />
          <div id="song-deck" className="v-module" style={{ maxWidth: '58rem' }}>
            {groups.map((g) => (
              <section key={g.id} data-deck-group className="mb-7 last:mb-0">
                <header className="sticky top-[72px] z-10 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2" style={{ background: 'var(--bg, var(--bg-primary))' }}>
                  <CoverArt mbid={g.mbid} title={g.album} className="w-11 flex-shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <Link href={`/verse/${space.group.slug}/albums/${g.albumSlug}`} className="verse-link block truncate text-[15px] font-extrabold no-underline" style={{ color: 'var(--verse-ink)' }}>{g.album}</Link>
                    <p className="text-[11.5px] tabular-nums text-tertiary">{g.year} · {g.tracks.length} track{g.tracks.length === 1 ? '' : 's'}</p>
                  </div>
                </header>
                <ul className="mt-1">
                  {g.tracks.map((t) => (
                    <li key={`${g.id}-${t.position}-${t.title}`} data-deck-item data-f-year={g.year} data-f-album={g.album} data-search={`${t.title} ${g.album}`}
                      className="flex items-baseline gap-x-3 border-t py-2 pl-14" style={{ borderColor: 'var(--v-hairline)' }}>
                      <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-tertiary">{t.position}</span>
                      {t.songId ? (
                        <Link href={`/verse/${space.group.slug}/songs/${t.songId}`} className="min-w-0 flex-1 truncate text-[14.5px] font-semibold no-underline hover:underline" style={{ color: 'var(--verse-ink)' }}>{t.title}</Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold" style={{ color: 'var(--verse-ink)' }}>{t.title}</span>
                      )}
                      <TrackPlay youtubeId={t.youtubeId} start={t.clipStart} curatedUrl={t.curatedUrl} title={t.title} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
