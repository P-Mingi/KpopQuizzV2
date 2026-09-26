'use client';

import { Fragment, useMemo, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { Icon } from '@/components/ux-v1/icon';
import { UxPopover } from '@/components/ux-v1/popover';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { tabPanelProps } from '@/components/ux-v1/tab-panel';
import { UxTabs } from '@/components/ux-v1/tabs';
import { composerLine } from '@/lib/ux-v1/p8/draft';

import { useEditor } from './editor';
import { FeedCard } from './feed-card';
import { useP8Viewer } from './viewer';

import type { FeedPost } from '@/lib/ux-v1/p8/types';

// The feed island (DESIGN-SPEC 16.7 community): one-field composer, tabs For you /
// Following / Blogs, the group menu, the posts (every card is server data, links are
// real hrefs), phones get the war strip + today's debate on top and the rail block
// after the third post, then "Show more posts" (10 at a time). Filtering is local:
// /community is noindex (a new URL), so no filter needs its own URL.

type Tab = 'all' | 'following' | 'blogs';
const PAGE = 10;
const TABS: { id: Tab; label: string }[] = [{ id: 'all', label: 'For you' }, { id: 'following', label: 'Following' }, { id: 'blogs', label: 'Blogs' }];

export function Composer(): React.ReactElement | null {
  const v = useP8Viewer();
  const { open, modes } = useEditor();
  // No mode can post (hidden Verse and the pending stores): no composer, no dead door.
  const first = modes[0];
  if (!first) return null;
  return (
    <div className="p8-composer">
      {v.signedIn ? <UxAvatar name={v.displayName ?? v.username ?? 'You'} src={v.avatarUrl} size={40} /> : null}
      <button type="button" className="p8-composer-in" onClick={() => open(first)}>
        <span>{composerLine(modes)}</span>
      </button>
      <button type="button" className="ux-btn ux-btn-ghost" onClick={() => open(first)}>
        <Icon name="pen" />New post
      </button>
    </div>
  );
}

function GroupMenu({ groups, value, onChange }: { groups: { slug: string; name: string }[]; value: string | null; onChange: (slug: string | null) => void }): React.ReactElement {
  const current = groups.find((g) => g.slug === value);
  const items = [{ slug: null as string | null, name: 'All groups' }, ...groups];
  return (
    <UxPopover
      wrap
      menu
      label="Group"
      className="ux-ddpop"
      trigger={(p) => (
        <button type="button" className="ux-dd" {...p} aria-label={`Group: ${current?.name ?? 'All groups'}`}>
          <span>{current?.name ?? 'All groups'}</span>
          <Icon name="chev" />
        </button>
      )}
    >
      {(close) => items.map((g) => (
        <button key={g.slug ?? 'all'} type="button" role="menuitemradio" aria-checked={g.slug === value} className="ux-mi" onClick={() => { onChange(g.slug); close(); }}>
          {g.name}
        </button>
      ))}
    </UxPopover>
  );
}

export function CommunityFeed({ posts, loadFailed = false, blogs = true, mtop, mrail }: { posts: FeedPost[]; loadFailed?: boolean; blogs?: boolean; mtop?: React.ReactNode; mrail?: React.ReactNode }): React.ReactElement {
  const v = useP8Viewer();
  const signIn = useSignIn();
  const [tab, setTab] = useState<Tab>('all');
  const [group, setGroup] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const groups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of posts) if (p.group) seen.set(p.group.slug, p.group.name);
    return [...seen.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [posts]);

  const list = useMemo(() => posts.filter((p) => {
    if (group && p.group?.slug !== group) return false;
    if (tab === 'blogs') return p.kind === 'blog';
    if (tab === 'following') return !!p.author?.username && v.following.has(p.author.username);
    return true;
  }), [posts, tab, group, v.following]);

  const visible = list.slice(0, shown);
  const railAt = Math.min(3, visible.length);

  let empty: React.ReactNode = null;
  if (!visible.length) {
    if (loadFailed) {
      empty = <div className="p8-empty" role="status"><b>The feed did not load</b>Refresh the page in a moment.</div>;
    } else if (tab === 'following' && !v.signedIn) {
      empty = (
        <div className="p8-empty">
          <b>Follow fans to fill this tab</b>
          Sign in, then follow fans from their posts.
          <div><button type="button" className="ux-btn ux-btn-ghost" style={{ marginTop: 16 }} onClick={() => signIn({ title: 'Sign in to follow fans', sub: 'Posts from fans you follow show here. No password needed.' })}>Sign in</button></div>
        </div>
      );
    } else if (tab === 'following') {
      empty = <div className="p8-empty"><b>Nothing from the fans you follow yet</b>Follow fans from their posts and replies.</div>;
    } else if (tab === 'blogs') {
      empty = <div className="p8-empty"><b>No blogs{group ? ' for this group' : ''} yet</b>Blogs show here once a curator publishes them.</div>;
    } else {
      empty = <div className="p8-empty"><b>No posts{group ? ' for this group' : ''} yet</b>Start the first thread.</div>;
    }
  }

  return (
    <>
      <div className="p8-fctl">
        <UxTabs items={blogs ? TABS : TABS.filter((t) => t.id !== 'blogs')} value={tab} onChange={(t) => { setTab(t as Tab); setShown(PAGE); }} label="Feed" idPrefix="p8-feed" />
        {groups.length ? <GroupMenu groups={groups} value={group} onChange={(g) => { setGroup(g); setShown(PAGE); }} /> : null}
      </div>
      {mtop}
      <div className="p8-feed" {...tabPanelProps('p8-feed', tab)}>
        {visible.map((p, i) => (
          <Fragment key={`${p.kind}-${p.key}`}>
            <FeedCard post={p} />
            {i === railAt - 1 ? mrail : null}
          </Fragment>
        ))}
        {!visible.length ? <>{empty}{mrail}</> : null}
      </div>
      {list.length > shown ? (
        <div className="p8-more">
          <button type="button" className="ux-btn ux-btn-ghost" onClick={() => setShown((n) => n + PAGE)}>Show more posts</button>
        </div>
      ) : null}
    </>
  );
}
