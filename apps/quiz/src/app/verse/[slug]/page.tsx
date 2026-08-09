import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { VerseHomeHead } from '@/components/verse/tree/home-head';
import { VerseHomeRail } from '@/components/verse/tree/home-rail';
import { VerseHomeCenter } from '@/components/verse/tree/home-center';
import { musicGroupLd, jsonLdScript } from '@/lib/verse/jsonld';

export const revalidate = 3600;

// W-CUSTOM step 1 - the home tab now renders through the presentation renderer.
// This page passes presentation=null (the migration that adds the column is step
// 2), so the renderer falls back to the default placements, which are byte-identical
// to the pre-W-CUSTOM layout. Structure (breadcrumbs, JSON-LD, the 3-col grid, the
// fixed related-graph footer) stays fixed; only the module stacks are composable.
export default async function SpaceHomePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  return (
    <>
      {jsonLdScript(musicGroupLd({
        name: space.group.name, slug: space.group.slug, fandom_name: space.group.fandom_name,
        inception_date: space.group.inception_date, official_website: space.group.official_website,
        record_label: space.group.record_label, memberNames: space.idols.map((i) => i.name),
      }))}
      {/* V-FOUNDATION F4.2: the home v2 page head carries the page's ONE h1 (the group
          name); the shared space hero + tabs are suppressed for the home. */}
      <VerseHomeHead space={space} />
      {/* V-FOUNDATION F4.3: the two-column body - the document column (still the
          unified Composition; the doc-column reconciliation is F4.5) + the real
          data rail. */}
      <div id="vh2-body" className="vh2-layout">
        <div className="vh2-doc">
          <div className="mb-6">
            <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name }]} />
          </div>
          {/* V3: the editorial center - Overview (fold) / Members / Discography / The story
              so far / Community & Play, all pure presentation over the existing reads. */}
          <VerseHomeCenter space={space} />
        </div>
        <aside className="vh2-rail" aria-label={`${space.group.name} data`}>
          <VerseHomeRail space={space} />
        </aside>
      </div>
    </>
  );
}
