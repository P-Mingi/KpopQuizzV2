import { notFound } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpace } from '@/lib/verse/space';
import { CreateDialog } from '@/components/verse/tree/create-dialog';

import type { Metadata } from 'next';

// V-FOUNDATION F1 Phase D - the create-from-anywhere host. Curator-gated (404 for
// everyone else), noindex. Prefilled from a ghost link's ?title=&slug= so a red link
// clicks straight into "create this exact page".
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New page', robots: { index: false, follow: false } };

export default async function NewPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; slug?: string; parent?: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const sp = await searchParams;
  const space = await getSpace(slug);
  if (!space) notFound();

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, space.group.id))) notFound();

  return (
    <div className="verse-page verse-scope" style={{ paddingTop: 24 }}>
      <CreateDialog
        groupId={space.group.id}
        spaceSlug={slug}
        initialTitle={sp.title ?? ''}
        initialSlug={sp.slug ?? ''}
        initialParentId={sp.parent ? Number(sp.parent) || null : null}
      />
    </div>
  );
}
