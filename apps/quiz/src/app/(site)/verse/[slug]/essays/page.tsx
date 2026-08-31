import Link from 'next/link';
import { Byline } from '@/components/verse/primitives/byline';
import { EmptyState } from '@/components/verse/primitives/empty-state';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { getMagazine } from '@/lib/verse/essays';
import { EssaysClient } from '@/components/verse/essays-client';
import { EssayCuratorPanel } from '@/components/verse/essay-curator-panel';

import type { Metadata } from 'next';
import type { EssayCard } from '@/lib/verse/essays';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Essays' };
  return { title: `${space.group.name} essays`, description: `The ${space.group.name} essay magazine: long-form fan writing, reviewed and featured by curators.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/essays` } };
}

function ByLine({ e }: { e: EssayCard }): React.ReactElement {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-secondary">
      <Byline identity={e.author ? { ...e.author, role: e.authorRole } : null} prefix="by" />
      <span aria-hidden className="text-tertiary">·</span>
      <span className="text-tertiary tabular-nums">{e.readingMin} min read</span>
    </span>
  );
}

function EssayRow({ e, slug }: { e: EssayCard; slug: string }): React.ReactElement {
  return (
    <li>
      <Link href={`/verse/${slug}/essays/${e.id}`} className="group block rounded-xl border p-4 no-underline transition-colors hover:bg-[var(--verse-soft)]" style={{ borderColor: 'var(--verse-line)' }}>
        <p className="text-base font-bold leading-snug" style={{ color: 'var(--verse-ink)', fontFamily: 'var(--v-editorial-font)' }}>{e.title}</p>
        {e.dek ? <p className="mt-1 line-clamp-2 text-sm text-secondary">{e.dek}</p> : null}
        <div className="mt-2"><ByLine e={e} /></div>
      </Link>
    </li>
  );
}

// V-ESSAYS-MAX step 2 - THE MAGAZINE INDEX. Featured hero (editorial serif
// voice), series shelves with counts, latest rows, member-gated write CTA. Every
// tier min-gates: the hero hides without a curator pick, a shelf hides below one
// series, latest hides when empty. The catalog is public/crawlable; the write
// affordance (EssaysClient) is member-gated per V-MODES.
export default async function EssaysPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const mag = await getMagazine(space.group.id);

  return (
    <div>
      <div className="mb-5"><Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Essays' }]} /></div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tertiary">The magazine</p>
      <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: 'var(--verse-ink)', fontFamily: 'var(--v-editorial-font)' }}>{space.group.fandom_name} essays</h1>
      <p className="mt-2 max-w-[66ch] text-sm text-secondary">Long-form fan writing about {space.group.name}, reviewed and featured by curators.</p>

      {mag.publicCount === 0 ? (
        <EmptyState headline="No essays yet." body="Members write them; curators feature the best." />
      ) : (
        <div className="mt-7 space-y-10">
          {/* Featured hero: hides without a curator pick. */}
          {mag.hero ? (
            <section aria-label="Featured essay">
              <Link href={`/verse/${slug}/essays/${mag.hero.id}`} className="group block overflow-hidden rounded-2xl border no-underline" style={{ borderColor: 'var(--verse-line)', background: 'linear-gradient(160deg, var(--verse-soft-strong), var(--verse-soft) 60%, transparent)' }}>
                <div className="p-6 sm:p-8">
                  <p className="v-kicker-accent text-[11px] font-bold uppercase tracking-[0.16em]">Featured</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: 'var(--verse-ink)', fontFamily: 'var(--v-editorial-font)', textWrap: 'balance' } as React.CSSProperties}>{mag.hero.title}</h2>
                  {mag.hero.dek ? <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-secondary">{mag.hero.dek}</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <ByLine e={mag.hero} />
                    {mag.hero.commentCount > 0 ? <><span aria-hidden className="text-tertiary">·</span><span className="text-sm text-tertiary tabular-nums">{mag.hero.commentCount} comment{mag.hero.commentCount === 1 ? '' : 's'}</span></> : null}
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          {/* Series shelves: hide below one series. */}
          {mag.series.map((s) => (
            <section key={s.id} aria-label={`${s.title} series`}>
              <h2 className="v-section-title">{s.title} <span className="text-lg font-semibold text-tertiary tabular-nums">{s.essays.length}</span></h2>
              <div className="v-section-rule" aria-hidden />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.essays.map((e) => <EssayRow key={e.id} e={e} slug={slug} />)}
              </ul>
            </section>
          ))}

          {/* Latest. */}
          {mag.latest.length ? (
            <section aria-label="Latest essays">
              <h2 className="v-section-title">Latest</h2>
              <div className="v-section-rule" aria-hidden />
              <ul className="grid gap-3 sm:grid-cols-2">
                {mag.latest.map((e) => <EssayRow key={e.id} e={e} slug={slug} />)}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <div className="mt-10 border-t pt-6" style={{ borderColor: 'var(--verse-line)' }}>
        <EssaysClient groupId={space.group.id} groupSlug={slug} />
      </div>
      <EssayCuratorPanel groupId={space.group.id} groupSlug={slug} />
    </div>
  );
}
