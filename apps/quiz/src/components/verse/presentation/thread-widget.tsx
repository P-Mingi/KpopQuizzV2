import Link from 'next/link';
import { Byline } from '@/components/verse/primitives/byline';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { listThreads } from '@/lib/verse/threads';

import type { ModuleProps } from './module-registry';

// V-COMM-3 step 4 - the featured-discussion home widget (duality). The community
// threads, surfaced on the space home with their own identity (a "Talk of the
// space" kicker), distinct from the essay / binder / shelf / atlas widgets. Pure
// server render; min-gates by returning null when a space has no thread yet.
export async function FeaturedThreadModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const threads = await listThreads(space.group.id);
  if (threads.length === 0) return null;
  const top = threads[0]!;

  return (
    <div>
      <SectionHeader kicker="Talk of the space" />
      <Link href={`/verse/${space.group.slug}/community/${top.slug}`} className="mt-2 block no-underline">
        <p className="text-[15px] font-extrabold leading-snug" style={{ color: 'var(--verse-ink)' }}>{top.title}</p>
        <p className="mt-1 text-xs text-tertiary">
          <Byline identity={top.author} prefix="by" link={false} /> · <span className="tabular-nums">{top.replyCount} {top.replyCount === 1 ? 'reply' : 'replies'}</span>
        </p>
      </Link>
      {threads.length > 1 ? (
        <Link href={`/verse/${space.group.slug}/community`} className="mt-2 inline-block text-[13px] font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
          {threads.length} threads in the community
        </Link>
      ) : null}
    </div>
  );
}
