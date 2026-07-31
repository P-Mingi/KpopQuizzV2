import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { TrackPlay } from '@/components/verse/track-play';
import { CuratedVideoControl } from '@/components/verse/curated-video-control';
import { createPublicReadClient } from '@/lib/supabase/server';
import { getSpace } from '@/lib/verse/space';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { isConfiguredImageHost } from '@/lib/image-hosts';

import type { Metadata } from 'next';

export const revalidate = 3600;

/* V4 Part 1 item 5 - THE SONG PAGE, built on the album standard: cover-led
   tinted header, credits rail, the play affordance (curated official video or
   the blindtest clip default), the story link, related exits. Every track is
   a page now (the infinite-depth law). */

const normalize = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

interface SongRow {
  id: string; title: string; artist_name: string | null; album_name: string | null;
  album_cover_medium: string | null; album_cover_big: string | null;
  duration: number | null; year: number | null; language: string | null; group_id: number;
}

async function loadSong(groupId: number, id: string): Promise<SongRow | null> {
  const db = createPublicReadClient();
  const { data } = await db.from('songs')
    .select('id, title, artist_name, album_name, album_cover_medium, album_cover_big, duration, year, language, group_id')
    .eq('id', id).eq('group_id', groupId).maybeSingle();
  return (data as SongRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Song' };
  const song = await loadSong(space.group.id, id);
  if (!song) return { title: 'Song' };
  return {
    title: `${song.title} - ${space.group.name}`,
    description: `${song.title} by ${space.group.name}${song.album_name ? ` (${song.album_name})` : ''}${song.year ? `, ${song.year}` : ''}. Listen, read the story, explore the album.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/songs/${id}` },
  };
}

function fmtDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default async function SongPage({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<React.ReactElement> {
  const { slug, id } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const song = await loadSong(space.group.id, id);
  if (!song) notFound();

  const db = createPublicReadClient();
  const [{ data: bt }, { data: override }, pages] = await Promise.all([
    db.from('blind_test_songs').select('youtube_id, clip_chorus').eq('group_id', space.group.id).eq('status', 'active').ilike('title', song.title).limit(1).maybeSingle(),
    db.from('entity_overrides').select('value').eq('entity_type', 'song').eq('entity_id', song.id).eq('field', 'youtube_url').maybeSingle(),
    listPublishedPages(space.group.id),
  ]);
  const blind = bt as { youtube_id: string | null; clip_chorus: number | null } | null;
  const curated = (override as { value: string | null } | null)?.value ?? null;
  const story = pages.find((p) => p.kind === 'song_story' && normalize(p.title) === normalize(song.title)) ?? null;
  const album = song.album_name ? space.albums.find((a) => normalize(a.title) === normalize(song.album_name!)) ?? null : null;
  const cover = [song.album_cover_big, song.album_cover_medium].find((u) => u && isConfiguredImageHost(u)) ?? null;
  const duration = fmtDuration(song.duration);

  return (
    <article className="mt-2">
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Songs', href: `/verse/${slug}/songs` }, { label: song.title }]} />

      {/* The header band, album standard: cover + title on the accent wash. */}
      <header className="mt-3 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(120deg, var(--verse-soft-strong), var(--verse-soft) 55%, transparent)' }}>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-7">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={`${song.album_name ?? song.title} cover art`} width={208} height={208} loading="eager" referrerPolicy="no-referrer"
              className="w-40 flex-shrink-0 rounded-xl object-cover shadow-lg sm:w-52" style={{ aspectRatio: '1 / 1' }} />
          ) : (
            <span className="flex w-40 flex-shrink-0 items-center justify-center rounded-xl sm:w-52" style={{ aspectRatio: '1 / 1', background: 'var(--verse-soft-strong)' }} aria-hidden>
              <svg viewBox="0 0 48 48" width="42%" height="42%" fill="none" stroke="var(--verse-ink)" strokeWidth="2"><circle cx="24" cy="24" r="20" opacity="0.55" /><circle cx="24" cy="24" r="9" opacity="0.75" /><circle cx="24" cy="24" r="2.5" fill="var(--verse-ink)" stroke="none" /></svg>
            </span>
          )}
          <div className="min-w-0 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">{space.group.name} · Song</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: 'var(--verse-ink)' }}>{song.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-secondary">
              {song.album_name ? (album
                ? <Link href={`/verse/${slug}/albums/${album.slug}`} className="verse-link">{song.album_name}</Link>
                : <span>{song.album_name}</span>) : null}
              {song.year ? <><span aria-hidden>·</span><span className="tabular-nums">{song.year}</span></> : null}
              {duration ? <><span aria-hidden>·</span><span className="tabular-nums">{duration}</span></> : null}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <TrackPlay youtubeId={blind?.youtube_id ?? null} start={blind?.clip_chorus ?? 0} curatedUrl={curated} title={song.title} size="hero" />
              <CuratedVideoControl songId={song.id} groupSlug={slug} current={curated} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {story ? (
            <section className="mb-6">
              <h2 className="v-section-title">The story</h2>
              <div className="v-section-rule" aria-hidden />
              <p className="max-w-[66ch] text-sm leading-relaxed text-secondary">
                {space.group.fandom_name} wrote this song&rsquo;s story.{' '}
                <Link href={`/verse/${slug}/wiki/${story.slug}`} className="verse-link font-bold">Read {story.title}</Link>
              </p>
            </section>
          ) : (
            <section className="mb-6">
              <h2 className="v-section-title">The story</h2>
              <div className="v-section-rule" aria-hidden />
              <p className="max-w-[66ch] text-sm leading-relaxed text-tertiary">
                No fan has written this song&rsquo;s story yet. Song stories start from the wiki, credited to their authors.
              </p>
            </section>
          )}
        </div>

        <aside className="mt-2 lg:mt-0">
          <div className="verse-frame verse-frame-rounded">
            <h2 className="v-eyebrow">Track facts</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {song.artist_name ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Artist</dt><dd className="text-right font-semibold text-primary">{song.artist_name}</dd></div> : null}
              {song.year ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Year</dt><dd className="font-semibold tabular-nums text-primary">{song.year}</dd></div> : null}
              {duration ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Length</dt><dd className="font-semibold tabular-nums text-primary">{duration}</dd></div> : null}
              {song.language ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Language</dt><dd className="font-semibold uppercase text-primary">{song.language}</dd></div> : null}
            </dl>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {album ? (
              <Link href={`/verse/${slug}/albums/${album.slug}`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
                The {song.album_name} album
              </Link>
            ) : null}
            <Link href={`/verse/${slug}/songs`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>
              The song deck
            </Link>
            <Link href={`/blindtest/group-${slug}`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>
              Blind test the {space.group.name} catalog
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
