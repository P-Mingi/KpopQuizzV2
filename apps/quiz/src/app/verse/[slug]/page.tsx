import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { CompositionRenderer } from '@/components/verse/presentation/composition-renderer';
import { presentationToComposition } from '@/lib/verse/composition/convert';
import { getGroupBacklinks } from '@/lib/verse/backlinks';
import { getSpace } from '@/lib/verse/space';
import { getPortalComposition } from '@/lib/verse/tree/portal';
import { VerseHomeHead } from '@/components/verse/tree/home-head';
import { createPublicReadClient } from '@/lib/supabase/server';
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

  // V-FOUNDATION F1 C11: render the home from the PORTAL page (pages.blocks) when the
  // space has one; else fall back to the legacy verse_spaces.presentation with byte
  // parity (the strangler seam - a space is migrated by its first publish).
  const portalComposition = await getPortalComposition(createPublicReadClient(), space.group.id);
  const composition = portalComposition ?? presentationToComposition(space.presentation);

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
      <div id="vh2-body" className="grid grid-cols-1 gap-x-8 lg:grid-cols-3 lg:gap-x-16">
        <div className="lg:col-span-3 mb-6">
          <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name }]} />
        </div>
        {/* V-BUILDER-1 step 3: the home body still renders THROUGH the unified
            Composition (presentation -> composition -> the one renderer). The v2
            two-column doc + data rail restructure is F4.3-F4.5. */}
        <CompositionRenderer space={space} composition={composition} backlinks={backlinks} />
      </div>
    </>
  );
}
