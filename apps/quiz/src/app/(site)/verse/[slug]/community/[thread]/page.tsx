import { notFound } from 'next/navigation';
import { Byline } from '@/components/verse/primitives/byline';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { DiscussionThread } from '@/components/verse/discussion-thread';
import { WatchButton } from '@/components/verse/watch-button';
import { getSpace } from '@/lib/verse/space';
import { getThreadBySlug } from '@/lib/verse/threads';
import { getThreadComments } from '@/lib/verse/discussions';
import { jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; thread: string }> }): Promise<Metadata> {
  const { slug, thread } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Thread' };
  const t = await getThreadBySlug(space.group.id, thread);
  if (!t) return { title: 'Thread', robots: { index: false, follow: true } };
  return {
    title: `${t.title} - ${space.group.fandom_name} community`,
    description: `A ${space.group.fandom_name} discussion: ${t.title}`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/community/${t.slug}` },
  };
}

// V-COMM-3 step 2 - THE THREAD PAGE. Every community discussion is now an
// addressable, shareable thread with its own permalink. The comment machinery
// (reparented onto thread_id) renders the replies; the byline resolves through the
// V-PROFILE-ONE identity resolver; watch/notify reuse the existing rails.
export default async function ThreadPage({ params }: { params: Promise<{ slug: string; thread: string }> }): Promise<React.ReactElement> {
  const { slug, thread } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const t = await getThreadBySlug(space.group.id, thread);
  if (!t) notFound();

  // Server-render the replies so the discussion is in the crawlable HTML (not a
  // JS-only doorway); the client island still refetches for the live view.
  const initialComments = await getThreadComments(t.id, space.group.id);
  const authorName = t.author?.displayName ?? 'a fan';

  return (
    <article className="mx-auto max-w-3xl">
      {jsonLdScript({
        '@context': 'https://schema.org', '@type': 'DiscussionForumPosting',
        headline: t.title, datePublished: t.createdAt, dateModified: t.lastActivityAt,
        author: { '@type': 'Person', name: authorName },
        about: space.group.name, isAccessibleForFree: true,
        commentCount: t.replyCount,
        interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: t.replyCount },
        mainEntityOfPage: `https://kpopquiz.org/verse/${slug}/community/${t.slug}`,
      })}

      <div className="mb-4"><Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Community', href: `/verse/${slug}/community` }, { label: t.title }]} /></div>

      <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: 'var(--verse-ink)', textWrap: 'balance' } as React.CSSProperties}>{t.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-b pb-4 text-sm text-secondary" style={{ borderColor: 'var(--verse-line)' }}>
        <Byline identity={t.author} prefix="Started by" />
        <span aria-hidden className="text-tertiary">·</span>
        <span className="text-tertiary tabular-nums">{t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}</span>
        <span className="ml-auto"><WatchButton entityType="thread" entityId={String(t.id)} /></span>
      </div>

      <div className="mt-4">
        <DiscussionThread entityType="group" entityId={String(space.group.id)} groupId={space.group.id} threadId={t.id} initialComments={initialComments} />
      </div>
    </article>
  );
}
