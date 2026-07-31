import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { listPublishedPages } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';

import type { Metadata } from 'next';

export const revalidate = 3600;

// V-PAGES step 3 - the space wiki index, minimal honest v1 (published pages,
// grouped by kind, real counts). Step 6 upgrades this surface to the full
// faceted index (filters + search-within + jump chips); every link here is
// already real, so nothing dishonest ships in the meantime.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Wiki' };
  const title = `${space.group.name} wiki · the ${space.group.fandom_name} pages`;
  return {
    title: { absolute: title },
    description: `Fan-built pages in the ${space.group.fandom_name} home: lightsticks, songs, culture, glossary. Sourced and credited.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${space.group.slug}/wiki` },
  };
}

export default async function WikiIndexPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const pages = await listPublishedPages(space.group.id);

  const byKind = new Map<string, typeof pages>();
  for (const p of pages) {
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind)!.push(p);
  }

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${space.group.slug}` }, { label: 'Wiki' }]} />
      </div>

      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>Wiki</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
            {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? '' : 's'} in the ${space.group.fandom_name} home` : `The ${space.group.fandom_name} pages`}
          </h1>
          <Link href={`/verse/${space.group.slug}/wiki/new`} className="inline-flex min-h-[44px] items-center rounded-xl px-5 text-sm font-bold text-white no-underline" style={{ background: 'var(--verse-accent, #7c5cfc)' }}>
            New page
          </Link>
        </div>
      </header>

      {pages.length === 0 ? (
        <p className="v-module text-sm text-tertiary" style={{ maxWidth: 'var(--v-measure)' }}>
          No pages yet. The first fan to write one starts this space&rsquo;s wiki.
        </p>
      ) : (
        [...byKind.entries()].map(([kind, list]) => {
          const def = getKind(KPOP_PAGE_REGISTRY, kind);
          return (
            <section key={kind} className="v-module">
              <h2 className="v-eyebrow">{def?.label ?? kind} · {list.length}</h2>
              <div className="v-grid-cards">
                {list.map((p) => (
                  <Link key={p.id} href={`/verse/${space.group.slug}/wiki/${p.slug}`} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
                    <span className="block text-[14.5px] font-bold" style={{ color: 'var(--verse-ink)' }}>{p.title}</span>
                    {p.published_at ? <span className="mt-0.5 block text-[12px] text-tertiary">{p.published_at.slice(0, 10)}</span> : null}
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
