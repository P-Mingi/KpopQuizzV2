// V-BUILDER-2 step 2 - THE BUILDER SHELL. Route /verse/{slug}/build (curator+): a
// full-screen edit-in-place canvas. The shell is its own slim top bar + a same-
// origin iframe of the step-1 draft render (/build/{slug}); a client overlay reads
// the iframe geometry to select blocks. Architecture B (spike verdict): the canvas
// is the REAL render, never a rebuilt preview.
//
// It nests under the verse/[slug] layout, so the space hero + tabs render behind it;
// the shell is position:fixed inset:0 and covers them (and the root chrome hides via
// isBuilderCanvas). noindex, curator-gated (404 for everyone else), force-dynamic.
import { notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpace } from '@/lib/verse/space';
import { presentationScopeStyle } from '@/lib/verse/presentation/scope';
import { validatePresentation } from '@/lib/verse/presentation/validate';
import { EMPTY_PRESENTATION } from '@/lib/verse/presentation/types';
import { resolvePlacements } from '@/lib/verse/presentation/resolve';
import { presentationToComposition } from '@/lib/verse/composition/convert';
import { photocardCount } from '@/lib/verse/photocards';
import { collectibleCount } from '@/lib/verse/collectibles';
import { featuredEssayCount } from '@/lib/verse/essays';
import { getSection } from '@/lib/verse/content';
import { BuilderShell } from '@/components/verse/builder/builder-shell';

import type { Metadata } from 'next';
import type { Presentation } from '@/lib/verse/presentation/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Builder', robots: { index: false, follow: false } };

export default async function BuildShellPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  // Curator gate: invisible (404) to everyone else, same as the canvas + studio.
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, space.group.id))) notFound();

  // Draft state for the top bar: whether an unpublished draft already exists (from a
  // prior studio/builder session) + when it was last touched. Structural editing +
  // publish-from-builder land in step 3; step 2 only reports the state honestly.
  const svc = createServiceRoleClient();
  const { data: row } = await svc.from('verse_spaces')
    .select('presentation_draft, updated_at').eq('group_id', space.group.id).maybeSingle();
  const rawDraft = (row as { presentation_draft?: unknown } | null)?.presentation_draft;
  const isEmpty = !rawDraft || (typeof rawDraft === 'object' && Object.keys(rawDraft as object).length === 0);
  const hasDraft = !isEmpty;
  const updatedAt = (row as { updated_at?: string } | null)?.updated_at ?? null;

  // The client composition model: the SAME resolved+id-stamped block set the iframe
  // (/build) renders, so every op's block id maps 1:1 to a data-block-id in the canvas.
  // Empty/invalid draft falls back to the live look (same rule the canvas uses).
  const draft: Presentation = isEmpty
    ? (space.presentation ?? EMPTY_PRESENTATION)
    : (validatePresentation(rawDraft).value ?? space.presentation ?? EMPTY_PRESENTATION);
  const composition = presentationToComposition({ ...draft, version: 1, modules: resolvePlacements(draft) });

  // Per-space DATA-SOURCE readiness for the library's honest hints: a block whose real
  // source is empty for this space shows its min-gate sentence instead of inserting a
  // ghost. Only the cheaply-countable sources are asserted; anything absent defaults
  // ready, so a hint only ever fires when the source is provably empty.
  const gid = space.group.id;
  const [pc, cc, ec, pollRes] = await Promise.all([
    photocardCount(gid), collectibleCount(gid), featuredEssayCount(gid),
    svc.from('space_polls').select('id', { count: 'exact', head: true }).eq('group_id', gid),
  ]);
  const polls = pollRes.count ?? 0;
  const c = space.counts;

  // Inline text (step 6, L-044): the editable home text sections, seeded for the existing
  // section-editor surfaced in place. The intro block edits the group 'overview' section;
  // add more block->section pairs here as home text blocks gain content.
  const overview = await getSection('group', String(gid), 'overview');
  const editableSections: Record<string, { content: unknown; base: number | null }> = {
    overview: { content: overview.content, base: overview.currentRevisionId },
  };
  const sourceReady: Record<string, boolean> = {
    members: c.members > 0, discography: c.albums > 0, music: c.tracks > 0,
    spotlight: pc > 0, binder_widget: pc > 0, shelf_widget: cc > 0,
    collections: pc + cc > 0, featured_essay: ec > 0, poll: polls > 0,
  };

  return (
    <BuilderShell
      groupId={space.group.id}
      spaceName={space.group.name}
      draftPath={`/build/${slug}`}
      previewPath={`/verse/${slug}`}
      hasDraft={hasDraft}
      updatedAt={updatedAt}
      composition={composition}
      sourceReady={sourceReady}
      editableSections={editableSections}
      scopeStyle={presentationScopeStyle(space) as Record<string, string>}
    />
  );
}
