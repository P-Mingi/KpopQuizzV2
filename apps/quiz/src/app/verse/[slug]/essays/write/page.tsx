import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getEssay } from '@/lib/verse/essays';
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
