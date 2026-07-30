import { notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpace } from '@/lib/verse/space';
import { getGroupBacklinks } from '@/lib/verse/backlinks';
import { validatePresentation } from '@/lib/verse/presentation/validate';
import { EMPTY_PRESENTATION } from '@/lib/verse/presentation/types';
import { StudioClient } from '@/components/verse/studio/studio-client';
import { DraftPreview } from '@/components/verse/studio/draft-preview';

import type { Metadata } from 'next';
import type { Presentation } from '@/lib/verse/presentation/types';

// W-CUSTOM step 10 - the customization studio. Curator+ ONLY: a non-curator (and any
// logged-out visitor) gets notFound, so the studio and the draft it edits are never
// exposed to the public. Dynamic (auth); noindex.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Studio', robots: { index: false, follow: false } };

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, space.group.id)) notFound(); // invisible to non-curators

  // Load the draft; empty/invalid -> the live look as the starting point.
  const svc = createServiceRoleClient();
  const { data: row } = await svc.from('verse_spaces').select('presentation_draft').eq('group_id', space.group.id).maybeSingle();
  const rawDraft = (row as { presentation_draft?: unknown } | null)?.presentation_draft;
  const isEmpty = !rawDraft || (typeof rawDraft === 'object' && Object.keys(rawDraft as object).length === 0);
  const draft: Presentation = isEmpty
    ? (space.presentation ?? EMPTY_PRESENTATION)
    : (validatePresentation(rawDraft).value ?? space.presentation ?? EMPTY_PRESENTATION);

  const backlinks = await getGroupBacklinks(space.group.slug);
  const draftSpace = { ...space, presentation: draft };

  return (
    <StudioClient
      groupId={space.group.id}
      groupSlug={space.group.slug}
      groupName={space.group.fandom_name}
      initialDraft={draft}
      preview={<DraftPreview space={draftSpace} backlinks={backlinks} />}
    />
  );
}
