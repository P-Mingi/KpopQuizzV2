import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getAlbum } from '@/lib/verse/album';
import { getSection } from '@/lib/verse/content';
import { renderTipTapJSON } from '@/lib/verse/render-content';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { CoverArt } from '@/components/verse/cover-art';
import { SectionSurface } from '@/components/verse/editor/section-surface';
import { MoreAboutThis } from '@/components/verse/pages/more-about-this';
import { musicAlbumLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';

export const revalidate = 3600;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REGION_LABEL: Record<string, string> = { KR: 'Korea', JP: 'Japan', US: 'US', EN: 'English' };

function prettyDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const normalize = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export async function generateMetadata({ params }: { params: Promise<{ slug: string; album: string }> }): Promise<Metadata> {
  const { slug, album } = await params;
  const a = await getAlbum(slug, album);
  if (!a) return { title: 'Album' };
  return {
    title: `${a.title} - ${a.group.name}`,
    description: `${a.title} by ${a.group.name} (${a.type.toUpperCase()}, ${a.release_date?.slice(0, 4) ?? 'TBA'}). Tracklist and release facts.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/albums/${album}` },
  };
}

/* V-POLISH step 5 (audit item 5) - the album page is the most image-obligated
   surface on the Verse side and shipped imageless. Now: cover art in a tinted
   header band, tracks linking onward to their song stories, a facts rail with
   the era door, and the About block as a REAL editable section instead of a
   dashed apology. */
export default async function AlbumPage({ params }: { params: Promise<{ slug: string; album: string }> }): Promise<React.ReactElement> {
  const { slug, album } = await params;
  const a = await getAlbum(slug, album);
  if (!a) notFound();

  const [about, pages] = await Promise.all([
    getSection('album', String(a.id), 'overview'),
    listPublishedPages(a.group.id),
  ]);
  // Track titles link onward to their song stories where one exists.
  const storyBySong = new Map(pages.filter((p) => p.kind === 'song_story').map((p) => [normalize(p.title), p.slug]));

  const date = prettyDate(a.release_date);
  const region = REGION_LABEL[a.region?.toUpperCase() ?? ''] ?? a.region?.toUpperCase() ?? null;

  return (
    <article className="mt-2">
      {jsonLdScript(musicAlbumLd({
        title: a.title, groupSlug: slug, albumSlug: album, groupName: a.group.name,
        release_date: a.release_date, type: a.type, numTracks: a.tracks.length,
      }))}
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: a.group.fandom_name, href: `/verse/${slug}` }, { label: 'Discography', href: `/verse/${slug}/discography` }, { label: a.title }]} />

      {/* The header band: cover + title on an accent-tinted wash. */}
      <header className="mt-3 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(120deg, var(--verse-soft-strong), var(--verse-soft) 55%, transparent)' }}>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-7">
          <CoverArt mbid={a.mbid} title={a.title} className="w-40 flex-shrink-0 rounded-xl shadow-lg sm:w-52" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">{a.group.name} · {a.type.toUpperCase()}</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: 'var(--verse-ink)' }}>{a.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-secondary">
              {date ? <span>{date}</span> : null}
              {region ? <><span aria-hidden>·</span><span>{region}</span></> : null}
              <span aria-hidden>·</span><span>{a.tracks.length} tracks</span>
            </p>
            {a.reviewFlag ? <p className="mt-1 text-[11px] text-tertiary">Version details under curator review.</p> : null}
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {/* Tracklist */}
          {a.tracks.length ? (
            <section className="mb-6">
              <SectionHeader kicker="Tracklist" as="h2" />
              <ol className="overflow-hidden rounded-xl border border-default" style={{ borderColor: 'var(--verse-line)' }}>
                {a.tracks.map((t) => {
                  const story = storyBySong.get(normalize(t.title));
                  return (
                    <li key={t.position} className="flex items-center gap-3 border-b border-default px-4 py-2.5 text-sm last:border-b-0" style={{ borderColor: 'var(--verse-line)' }}>
                      <span className="w-5 shrink-0 text-right tabular-nums text-tertiary">{t.position}</span>
                      {story ? (
                        <Link href={`/verse/${slug}/wiki/${story}`} className="verse-link min-w-0 flex-1 truncate">{t.title}</Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-primary">{t.title}</span>
                      )}
                      {story ? <span className="shrink-0 rounded px-1.5 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>Story</span> : null}
                      {t.linked ? (
                        <Link href={`/blindtest/group-${a.group.slug}`} className="shrink-0 text-xs font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Blind test</Link>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="mb-6 text-sm text-tertiary">Tracklist is being sourced.</p>
          )}

          {/* V-PAGES: custom pages that reference this album (versions, MV, choreo...). */}
          <MoreAboutThis groupId={a.group.id} groupSlug={slug} entityRef={`album:${album}`} entityLabel="this release" />

          {/* The About block is a real editable section now, same machinery as
              every other surface: fans write it, curators review it. */}
          <SectionSurface
            entityType="album" entityId={String(a.id)} section="overview" label="About this release"
            initialHtml={renderTipTapJSON(about.content)} initialContent={about.content}
            baseRevisionId={about.currentRevisionId} locked={about.locked} lockReason={about.lockReason}
            groupSlug={a.group.slug}
            emptyInvite={`Concept, credits and era notes for ${a.title}, written by ${a.group.fandom_name}.`}
          />
        </div>

        {/* The facts rail */}
        <aside className="mt-8 lg:mt-0">
          <div className="verse-frame verse-frame-rounded">
            <SectionHeader kicker="Release facts" as="h2" />
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-tertiary">Type</dt><dd className="font-semibold text-primary">{a.type.toUpperCase()}</dd></div>
              {date ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Released</dt><dd className="font-semibold tabular-nums text-primary">{date}</dd></div> : null}
              {region ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Region</dt><dd className="font-semibold text-primary">{region}</dd></div> : null}
              <div className="flex justify-between gap-3"><dt className="text-tertiary">Tracks</dt><dd className="font-semibold tabular-nums text-primary">{a.tracks.length}</dd></div>
            </dl>
            {a.sourced ? <p className="mt-3 text-[11px] leading-relaxed text-tertiary">Release data sourced from MusicBrainz (CC0).</p> : null}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {a.eraId != null ? (
              <Link href={`/verse/${slug}/timeline`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
                This era on the timeline
              </Link>
            ) : null}
            <Link href={`/blindtest/group-${a.group.slug}`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>
              Blind test the {a.group.name} catalog
            </Link>
            <Link href={`/verse/${slug}/discography`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>
              All {a.group.name} releases
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
