import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getEssay } from '@/lib/verse/essays';
import { createServerClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { renderTipTapJSON } from '@/lib/verse/render-content';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const e = await getEssay(Number(id));
  if (!e || e.status !== 'featured') return { title: 'Essay', robots: { index: false, follow: false } };
  return { title: `${e.title} - ${e.author?.displayName || e.author?.username || 'a fan'}`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/essays/${id}` } };
}

export default async function EssayDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<React.ReactElement> {
  const { slug, id } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const e = await getEssay(Number(id));
  if (!e || e.groupId !== space.group.id) notFound();

  // Non-featured essays are visible only to their author or a curator.
  if (e.status !== 'featured') {
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    const allowed = !!user && (user.id === e.authorId || await canCurateSpace(user.id, space.group.id));
    if (!allowed) notFound();
  }

  const html = renderTipTapJSON(e.content);
  const name = e.author?.displayName || e.author?.username || 'a fan';

  return (
    <article className="mx-auto max-w-2xl">
      <Link href={`/verse/${slug}/essays`} className="text-xs font-semibold text-secondary no-underline hover:text-primary">All essays</Link>
      {e.status !== 'featured' ? <p className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>Preview: {e.status} (not public yet)</p> : null}
      <h1 className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--verse-ink)' }}>{e.title}</h1>
      <p className="mt-1 text-sm text-tertiary">by {e.author?.username ? <Link href={`/u/${e.author.username}`} className="no-underline hover:text-secondary">{name}</Link> : name}</p>
      <div className="verse-prose mt-4" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
