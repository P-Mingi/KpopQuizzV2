import { notFound } from 'next/navigation';

import { PostView } from '@/components/community/ux-v1/post-view';
import { P8ViewerProvider } from '@/components/community/ux-v1/viewer';
import { UxPage } from '@/components/ux-v1/page';
import { safeFetch } from '@/lib/error-handling';
import { UX_V1 } from '@/lib/ux-v1';
import { getP8Features, NO_FEATURES } from '@/lib/ux-v1/p8/features';
import { feedSources, mergeFeed } from '@/lib/ux-v1/p8/feed';
import { excerpt } from '@/lib/ux-v1/p8/format';
import { getPost } from '@/lib/ux-v1/p8/post';
import { isPostKind } from '@/lib/ux-v1/p8/types';

import type { FeedPost } from '@/lib/ux-v1/p8/types';
import type { Metadata } from 'next';

// /community/<thread|blog|debate|challenge>/<id> (DESIGN-SPEC 13.4, 16.7 Post;
// prototype #postview). Flag OFF: unknown to the middleware (301 to / like today),
// notFound() backstop. Flag ON: new URLs, noindex + out of the sitemap until the owner
// decides (threads and blogs duplicate their /verse pages). Real rows only; a post
// that is hidden, unpublished or whose store is not live is a 404.

interface Params { kind: string; id: string }

async function load(p: Params): Promise<{ post: Awaited<ReturnType<typeof getPost>>; likes: boolean; features: Awaited<ReturnType<typeof getP8Features>> }> {
  if (!isPostKind(p.kind)) return { post: null, likes: false, features: NO_FEATURES };
  const features = await safeFetch(getP8Features(), NO_FEATURES, '[p8] features');
  const post = await getPost(p.kind, p.id, features);
  return { post, likes: features.likes, features };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  if (!UX_V1) return {};
  const p = await params;
  const { post } = await load(p).catch(() => ({ post: null }));
  if (!post) return { robots: { index: false, follow: false } };
  const desc = post.excerpt || excerpt(post.paragraphs.join(' '), 155) || `A ${post.kind} in the KpopQuiz community${post.group ? ` about ${post.group.name}` : ''}.`;
  return {
    title: post.title,
    description: desc,
    alternates: { canonical: post.href },
    robots: { index: false, follow: true },
  };
}

function pickMore(all: FeedPost[], post: FeedPost): FeedPost[] {
  const others = all.filter((p) => !(p.kind === post.kind && p.key === post.key));
  const same = others.filter((p) => post.group && p.group?.id === post.group.id);
  const rest = others.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, 3);
}

export default async function CommunityPostPage({ params }: { params: Promise<Params> }): Promise<React.ReactElement> {
  if (!UX_V1) notFound();
  const p = await params;
  const { post, likes, features } = await load(p);
  if (!post) notFound();
  const now = Date.now();
  const src = feedSources(features, now);
  const lists = await Promise.all([
    safeFetch(src.threads, [], '[p8] more threads'),
    safeFetch(src.blogs, [], '[p8] more blogs'),
    safeFetch(src.debates, [], '[p8] more debates'),
    safeFetch(src.fanDebates, [], '[p8] more fan debates'),
    safeFetch(src.challenges, [], '[p8] more challenges'),
  ]);
  const more = pickMore(mergeFeed(lists, now), post);

  return (
    <UxPage width="text" className="p8-page p8-post-page">
      <P8ViewerProvider>
        <PostView post={post} more={more} likesLive={likes} />
      </P8ViewerProvider>
    </UxPage>
  );
}
