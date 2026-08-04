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
import { BuilderShell } from '@/components/verse/builder/builder-shell';

import type { Metadata } from 'next';

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
  const hasDraft = !!rawDraft && typeof rawDraft === 'object' && Object.keys(rawDraft as object).length > 0;
  const updatedAt = (row as { updated_at?: string } | null)?.updated_at ?? null;

  return (
    <BuilderShell
      spaceName={space.group.name}
      draftPath={`/build/${slug}`}
      previewPath={`/verse/${slug}`}
      hasDraft={hasDraft}
      updatedAt={updatedAt}
      scopeStyle={presentationScopeStyle(space) as Record<string, string>}
    />
  );
}
