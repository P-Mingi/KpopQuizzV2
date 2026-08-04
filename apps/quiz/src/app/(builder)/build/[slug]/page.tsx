// V-BUILDER-2 step 1 - THE CHROME-LESS DRAFT-RENDER ROUTE. The iframe content for
// the Phase 2 edit-in-place canvas: renders the space's DRAFT composition through
// THE renderer (CompositionRenderer, same as the published page), so the canvas is
// the real reader render with zero drift (the spike verdict, architecture B).
//
// Chrome-less by construction: it lives OUTSIDE verse/[slug] (no space hero/tabs),
// and the root nav/footer components suppress themselves on /build/ (isBuilderCanvas).
// It self-applies the verse-scope + preset tokens so the module HTML is byte-
// identical to the published page. Curator-gated (404 for everyone else), noindex,
// force-dynamic (always the latest draft), middleware-allowlisted.
import { notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpace } from '@/lib/verse/space';
import { getGroupBacklinks } from '@/lib/verse/backlinks';
import { validatePresentation } from '@/lib/verse/presentation/validate';
import { EMPTY_PRESENTATION } from '@/lib/verse/presentation/types';
import { presentationScopeStyle } from '@/lib/verse/presentation/scope';
import { presentationToComposition } from '@/lib/verse/composition/convert';
import { CompositionRenderer } from '@/components/verse/presentation/composition-renderer';

import type { Metadata } from 'next';
import type { Presentation } from '@/lib/verse/presentation/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Builder canvas', robots: { index: false, follow: false } };

export default async function BuildCanvasPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  // Curator gate: invisible (404) to everyone else, same as the studio + spike.
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, space.group.id))) notFound();

  // The DRAFT composition, stored beside the published one in presentation jsonb.
  // Empty/invalid draft falls back to the live look (the same rule the studio uses),
  // so a space that has never opened the builder edits its current published look.
  const svc = createServiceRoleClient();
  const { data: row } = await svc.from('verse_spaces').select('presentation_draft').eq('group_id', space.group.id).maybeSingle();
  const rawDraft = (row as { presentation_draft?: unknown } | null)?.presentation_draft;
  const isEmpty = !rawDraft || (typeof rawDraft === 'object' && Object.keys(rawDraft as object).length === 0);
  const draft: Presentation = isEmpty
    ? (space.presentation ?? EMPTY_PRESENTATION)
    : (validatePresentation(rawDraft).value ?? space.presentation ?? EMPTY_PRESENTATION);

  const draftSpace = { ...space, presentation: draft };
  const backlinks = await getGroupBacklinks(space.group.slug);
  const composition = presentationToComposition(draft);

  // Same verse-scope wrapper + grid the published page renders inside, so the module
  // HTML from CompositionRenderer is byte-identical (minus the chrome). No sr-only h1
  // and no JSON-LD here: this surface is noindex and owns no page identity.
  return (
    <div
      className="verse-page verse-scope mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8"
      data-preset={draft.preset ?? undefined}
      data-build-canvas=""
      style={presentationScopeStyle(draftSpace)}
    >
      <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3 lg:gap-x-16">
        {/* builder: stamp each block with its stable data-block-id handle so the
            parent shell's overlay can select it. The module HTML is otherwise the
            real reader render (zero drift). */}
        <CompositionRenderer space={draftSpace} composition={composition} backlinks={backlinks} builder />
      </div>
    </div>
  );
}
