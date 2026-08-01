import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { DeckFilter } from '@/components/verse/pages/deck-filter';
import { WikiNewLink } from '@/components/verse/wiki-new-link';
import { AtlasView } from '@/components/verse/atlas/atlas-view';
import { AtlasSurface } from '@/components/verse/atlas/atlas-surface';
import { AtlasCounts } from '@/components/verse/atlas/atlas-counts';
import { wantedPages } from '@/lib/verse/pages/links';

import type { Metadata } from 'next';

// V-ATLAS step 3 - THE PAGE. The wiki index becomes the ATLAS: one page, two
// views of the same graph. The Index (the faceted, server-rendered page list,
// the Palworld pattern) is the crawlable CONTENT and stays usable with no JS;
// the constellation Map hydrates on top. URL stays /verse/{group}/wiki (no
// churn); titles and breadcrumbs read Atlas.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Atlas' };
  const title = `The ${space.group.fandom_name} atlas · ${space.group.name} pages`;
  return {
    title: { absolute: title },
    description: `The ${space.group.fandom_name} universe as one map: members, eras, releases and fan-built pages, all connected. Sourced and credited.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${space.group.slug}/wiki` },
  };
}

export default async function AtlasPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ hub?: string; trail?: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const { hub, trail } = await searchParams;
  const space = await getSpace(slug);
  if (!space) notFound();
  const [pages, wanted] = await Promise.all([listPublishedPages(space.group.id), wantedPages(space.group.id)]);

  const byKind = new Map<string, typeof pages>();
  for (const p of pages) {
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind)!.push(p);
  }

  const pageCount = pages.length;

  const indexSlot = pageCount === 0 ? (
    <p className="text-sm text-tertiary" style={{ maxWidth: 'var(--v-measure)' }}>
      No pages written yet. The map still charts this space&rsquo;s members, eras and releases; the first fan to write a page adds it here.
    </p>
  ) : (
    <>
      <DeckFilter scopeId="wiki-index" facets={[{ key: 'kind', label: 'Kind' }]} searchLabel="Search pages" />
      <div id="wiki-index">
        {[...byKind.entries()].map(([kind, list]) => {
          const def = getKind(KPOP_PAGE_REGISTRY, kind);
          return (
            <section key={kind} className="v-module">
              <h2 className="v-eyebrow">{def?.label ?? kind} · {list.length}</h2>
              <div className="v-grid-cards">
                {list.map((p) => (
                  <Link key={p.id} href={`/verse/${space.group.slug}/wiki/${p.slug}`}
                    data-deck-item data-f-kind={def?.label ?? kind} data-search={p.title}
                    className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
                    <span className="block text-[14.5px] font-bold" style={{ color: 'var(--verse-ink)' }}>{p.title}</span>
                    {p.published_at ? <span className="mt-0.5 block text-[12px] text-tertiary">{p.published_at.slice(0, 10)}</span> : null}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${space.group.slug}` }, { label: 'Atlas' }]} />
      </div>

      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>Atlas</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
              The {space.group.fandom_name} atlas
            </h1>
            <AtlasCounts pages={pageCount} wanted={wanted.length} groupSlug={space.group.slug} />
          </div>
          <WikiNewLink groupSlug={space.group.slug} />
        </div>
      </header>

      <AtlasSurface
        mapSlot={<AtlasView space={space} hubParam={hub} trailParam={trail} />}
        indexSlot={indexSlot}
      />
    </div>
  );
}
