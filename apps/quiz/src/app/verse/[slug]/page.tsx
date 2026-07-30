import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SpaceHomeRenderer } from '@/components/verse/presentation/space-home-renderer';
import { getGroupBacklinks } from '@/lib/verse/backlinks';
import { getSpace } from '@/lib/verse/space';
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
  const backlinks = await getGroupBacklinks(space.group.slug);

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3 lg:gap-x-16">
      {jsonLdScript(musicGroupLd({
        name: space.group.name, slug: space.group.slug, fandom_name: space.group.fandom_name,
        inception_date: space.group.inception_date, official_website: space.group.official_website,
        record_label: space.group.record_label, memberNames: space.idols.map((i) => i.name),
      }))}
      <div className="lg:col-span-3 mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name }]} />
      </div>
      <SpaceHomeRenderer space={space} presentation={space.presentation} backlinks={backlinks} />
    </div>
  );
}
