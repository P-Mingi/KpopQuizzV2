import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getAlbum } from '@/lib/verse/album';
import { musicAlbumLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';

export const revalidate = 3600;

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

export default async function AlbumPage({ params }: { params: Promise<{ slug: string; album: string }> }): Promise<React.ReactElement> {
  const { slug, album } = await params;
  const a = await getAlbum(slug, album);
  if (!a) notFound();

  return (
    <article className="mt-2 max-w-3xl">
      {jsonLdScript(musicAlbumLd({
        title: a.title, groupSlug: slug, albumSlug: album, groupName: a.group.name,
        release_date: a.release_date, type: a.type, numTracks: a.tracks.length,
      }))}
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: a.group.fandom_name, href: `/verse/${slug}` }, { label: 'Discography', href: `/verse/${slug}/discography` }, { label: a.title }]} />
      <Link href={`/verse/${slug}/discography`} className="mb-4 mt-2 inline-block text-xs font-semibold text-secondary no-underline hover:text-primary">‹ {a.group.name} discography</Link>

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold leading-tight" style={{ color: 'var(--verse-ink)' }}>{a.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tertiary">
          <span>{a.type.toUpperCase()}</span>
          {a.release_date ? <><span aria-hidden>·</span><span>{a.release_date}</span></> : null}
          <span aria-hidden>·</span><span className="uppercase">{a.region}</span>
          {a.sourced ? <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }} title="Ingested from MusicBrainz (CC0)">wd</span> : null}
        </p>
        {a.reviewFlag ? <p className="mt-1 text-[11px] text-tertiary">Version details under curator review.</p> : null}
      </header>

      {/* Tracklist */}
      {a.tracks.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-tertiary">Tracklist</h2>
          <ol className="overflow-hidden rounded-xl border border-default" style={{ borderColor: 'var(--verse-line)' }}>
            {a.tracks.map((t) => (
              <li key={t.position} className="flex items-center gap-3 border-b border-default px-4 py-2.5 text-sm last:border-b-0" style={{ borderColor: 'var(--verse-line)' }}>
                <span className="w-5 shrink-0 text-right tabular-nums text-tertiary">{t.position}</span>
                <span className="flex-1 text-primary">{t.title}</span>
                {t.linked ? (
                  <Link href={`/blindtest/group-${a.group.slug}`} className="shrink-0 text-xs font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Play</Link>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mb-6 text-sm text-tertiary">Tracklist is being sourced.</p>
      )}

      {/* Authored notes shell (W3) */}
      <section className="rounded-xl border border-dashed p-5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>About this release</h2>
        <p className="mt-1 text-sm text-secondary">Concept, credits and era notes, written by {a.group.fandom_name}, will live here.</p>
      </section>
    </article>
  );
}
