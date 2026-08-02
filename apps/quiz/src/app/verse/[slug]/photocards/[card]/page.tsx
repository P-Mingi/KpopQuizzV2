import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SourceChip } from '@/components/verse/source-chip';
import { PhotocardCollectControl } from '@/components/verse/photocard-collect-control';
import { ShelfPinButton } from '@/components/verse/shelf-pin-button';
import { getSpace } from '@/lib/verse/space';
import { getPhotocardById, getCardCommunityCounts, COMMUNITY_FLOOR } from '@/lib/verse/photocards';

import type { Metadata } from 'next';

export const revalidate = 3600;

const TYPE_LABEL: Record<string, string> = {
  album: 'Album card', pob: 'Pre-order benefit', fansign: 'Fansign', fanmeeting: 'Fanmeeting',
  event: 'Event', trading: 'Trading card', season_greetings: 'Season’s Greetings', md: 'Merch', other: 'Other',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string; card: string }> }): Promise<Metadata> {
  const { slug, card } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Photocard' };
  const row = await getPhotocardById(Number(card), space.group.id);
  if (!row) return { title: 'Photocard' };
  const bits = [row.era, row.version, row.card_type ? TYPE_LABEL[row.card_type] : null].filter(Boolean).join(', ');
  return {
    title: `${row.name} - ${space.group.name} photocard`,
    description: `${row.name}, a ${space.group.name} photocard${bits ? ` (${bits})` : ''}. Set details, sources, and how many fans own or want it.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/photocards/${row.id}` },
    // Indexable only once sourced (a sourced, published catalog entry). Unsourced
    // cards stay out of the index until a curator adds provenance.
    robots: row.source_url ? undefined : { index: false, follow: true },
  };
}

export default async function PhotocardDetailPage({ params }: { params: Promise<{ slug: string; card: string }> }): Promise<React.ReactElement> {
  const { slug, card } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const row = await getPhotocardById(Number(card), space.group.id);
  if (!row) notFound();

  const album = row.album_id ? space.albums.find((a) => a.id === row.album_id) ?? null : null;
  const member = row.idol_id ? space.idols.find((i) => i.id === row.idol_id) ?? null : null;
  const counts = await getCardCommunityCounts(row.id);
  const typeLabel = row.card_type ? TYPE_LABEL[row.card_type] ?? row.card_type : null;
  const chips = [row.era, row.version, typeLabel].filter(Boolean) as string[];

  return (
    <article className="mt-2">
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Photocards', href: `/verse/${slug}/photocards` }, { label: row.name }]} />

      <header className="mt-3 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(120deg, var(--verse-soft-strong), var(--verse-soft) 55%, transparent)' }}>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-7">
          {/* The typographic card face (photocard ratio; imageless by policy). */}
          <span className="flex w-40 flex-shrink-0 flex-col justify-end rounded-xl p-3 shadow-lg sm:w-48" style={{ aspectRatio: '55 / 85', background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>
            {row.version || typeLabel ? <span className="self-start rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.22)' }}>{row.version || typeLabel}</span> : null}
            <span className="mt-auto text-sm font-extrabold leading-tight">{row.name}</span>
            {row.era ? <span className="mt-1 text-[11px] font-semibold opacity-80">{row.era}</span> : null}
          </span>
          <div className="min-w-0 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">{space.group.name} · Photocard</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: 'var(--verse-ink)' }}>{row.name}</h1>
            {chips.length ? (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => <span key={c} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{c}</span>)}
              </p>
            ) : null}
            {member ? <p className="mt-2 text-sm text-secondary"><Link href={`/verse/${slug}/members/${member.slug}`} className="verse-link font-semibold">{member.name}</Link></p> : null}
            <div className="mt-4 flex flex-col gap-3">
              <PhotocardCollectControl cardId={row.id} groupSlug={slug} />
              <ShelfPinButton itemType="photocard" itemId={row.id} groupSlug={slug} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {/* Community signal: counts only, and only above the floor. */}
          <section className="mb-6">
            <h2 className="v-section-title">The fandom</h2>
            <div className="v-section-rule" aria-hidden />
            {counts.owned >= COMMUNITY_FLOOR || counts.wanted >= COMMUNITY_FLOOR ? (
              <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">
                {counts.owned >= COMMUNITY_FLOOR ? <span><span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{counts.owned}</span> {space.group.fandom_name} own it</span> : null}
                {counts.wanted >= COMMUNITY_FLOOR ? <span><span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{counts.wanted}</span> want it</span> : null}
              </p>
            ) : (
              <p className="max-w-[66ch] text-sm text-tertiary">Not enough collectors have added this card yet to show counts. Add it to your binder to help the count grow.</p>
            )}
          </section>
        </div>

        <aside className="mt-2 lg:mt-0">
          <div className="verse-frame verse-frame-rounded">
            <SectionHeader kicker="Card facts" as="h2" />
            <dl className="flex flex-col gap-2 text-sm">
              {album ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Set</dt><dd className="text-right font-semibold text-primary">{album.title}</dd></div> : null}
              {row.era ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Era</dt><dd className="text-right font-semibold text-primary">{row.era}</dd></div> : null}
              {row.version ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Version</dt><dd className="text-right font-semibold text-primary">{row.version}</dd></div> : null}
              {typeLabel ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Type</dt><dd className="text-right font-semibold text-primary">{typeLabel}</dd></div> : null}
              {row.rarity ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Rarity</dt><dd className="text-right font-semibold text-primary">{row.rarity}</dd></div> : null}
            </dl>
            {row.source_url ? <p className="mt-3 border-t border-default pt-2 text-[11px] text-tertiary">Sourced <SourceChip href={row.source_url} /></p> : null}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {album ? <Link href={`/verse/${slug}/albums/${album.slug}`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>The {album.title} album</Link> : null}
            {member ? <Link href={`/verse/${slug}/members/${member.slug}`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>More {member.name} cards</Link> : null}
            <Link href={`/verse/${slug}/photocards`} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>The {space.group.name} binder</Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
