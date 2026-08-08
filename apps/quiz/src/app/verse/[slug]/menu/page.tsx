import { notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpace } from '@/lib/verse/space';
import { getNavMenu } from '@/lib/verse/tree/nav';
import { NavEditor } from '@/components/verse/tree/nav-editor';

import type { Metadata } from 'next';

// V-FOUNDATION F1 Phase E - the curator menu editor host. Curator-gated (404 otherwise),
// noindex. The reader menu (layout) renders from the same nav_menus row this edits.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Menu editor', robots: { index: false, follow: false } };

export default async function MenuEditorPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, space.group.id))) notFound();

  const tree = (await getNavMenu(createServiceRoleClient(), space.group.id)) ?? [];
  return (
    <div style={{ paddingTop: 8 }}>
      <NavEditor groupId={space.group.id} spaceSlug={slug} initialTree={tree} />
    </div>
  );
}
