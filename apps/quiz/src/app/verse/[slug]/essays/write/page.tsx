import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getEssay } from '@/lib/verse/essays';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { createServerClient } from '@/lib/supabase/server';
import { EssayEditor } from '@/components/verse/essay-editor';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Write an essay', robots: { index: false, follow: false } };

export default async function WriteEssayPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ id?: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const { id: idParam } = await searchParams;
  const space = await getSpace(slug);
  if (!space) notFound();

  const { data: { user } } = await (await createServerClient()).auth.getUser();
  if (!user) redirect(`/login?returnTo=/verse/${slug}/essays/write`);

  // V-MODES: essay writing is a member affordance (build layer, minRole
  // member). Non-members get the honest explanation, never a dead form.
  const { role } = await currentSpaceRole(space.group.id);
  if (!roleAtLeast(role, 'member')) {
    return (
      <div className="mx-auto max-w-[60ch] rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--verse-soft)' }}>
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--verse-ink)' }}>Essays open to members</h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Join the {space.group.fandom_name} space to write one. Your drafts stay yours; curators feature the best on the essays shelf.
        </p>
        <p className="mt-4"><a href={`/verse/${slug}`} className="verse-link font-bold">Back to the space</a></p>
      </div>
    );
  }

  let init: { id: number; title: string; content: unknown; status: string } | null = null;
  if (idParam) {
    const e = await getEssay(Number(idParam));
    if (!e || e.authorId !== user.id || e.groupId !== space.group.id) notFound();
    if (e.status === 'featured' || e.status === 'submitted') redirect(`/verse/${slug}/essays`);
    init = { id: e.id, title: e.title, content: e.content, status: e.status };
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Write an essay</h1>
      <EssayEditor groupId={space.group.id} initialId={init?.id} initialTitle={init?.title} initialContent={init?.content} initialStatus={init?.status} />
    </div>
  );
}
