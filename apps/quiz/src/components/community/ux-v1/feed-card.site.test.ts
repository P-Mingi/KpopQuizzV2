// FandomVerse (review of 2026-10-28, finding 8): on the anime build every page lives under /anime, so a picture of a site path in a
// feed card (the site's own avatar, a public/idols cover, a photo) is requested under /anime; an absolute URL stays as it is and
// kpop and the hub (no base path) render what they rendered before. The base path is the constant Next inlines, stubbed here.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FeedPost } from '@/lib/ux-v1/p8/types';

const DEBATE: FeedPost = {
  kind: 'debate', key: '2026-09-17', href: '/community/debate/2026-09-17', title: 'Sub or dub?', excerpt: null, group: null,
  author: null, at: '2026-09-17T00:00:00.000Z', ago: 'Sep 17', replies: 0, likes: null,
  debate: { daily: true, open: false, closesAt: '2026-09-18T00:00:00.000Z', comments: 0, total: 2, options: [{ label: 'Sub', votes: 1 }, { label: 'Dub', votes: 1 }] },
};
const BLOG = (coverUrl: string): FeedPost => ({
  kind: 'blog', key: '2', href: '/community/blog/2', title: 'A blog', excerpt: null, group: null, author: null,
  at: '2026-07-31T13:03:11Z', ago: 'Jul 31', replies: 0, likes: null, blog: { coverUrl, coverFocal: 'center 22%', readingMin: 3 },
});
const THREAD = (photo: string): FeedPost => ({
  kind: 'thread', key: '1', href: '/community/thread/1', title: 'A thread', excerpt: null, group: null, author: null,
  at: '2026-09-26T11:40:00Z', ago: '20 min ago', replies: 0, likes: null, photo,
});

async function render(base: string | undefined, post: FeedPost): Promise<string> {
  vi.resetModules();
  if (base !== undefined) vi.stubEnv('__NEXT_ROUTER_BASEPATH', base);
  const [{ FeedCard }, react, server] = await Promise.all([import('./feed-card'), import('react'), import('react-dom/server')]);
  return server.renderToStaticMarkup(react.createElement(FeedCard, { post }));
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('feed card pictures carry the base path of the build', () => {
  it('anime: the site avatar, a site-path cover and a site-path photo are under /anime; an absolute URL is not touched', async () => {
    expect(await render('/anime', DEBATE)).toContain('src="/anime/mascot/mascot-default.png"');
    expect(await render('/anime', BLOG('/idols/BTS.jpg'))).toContain('src="/anime/idols/BTS.jpg"');
    expect(await render('/anime', THREAD('/x/photo.jpg'))).toContain('src="/anime/x/photo.jpg"');
    const abs = 'https://example.supabase.co/storage/v1/object/public/space-assets/a.jpg';
    expect(await render('/anime', THREAD(abs))).toContain(`src="${abs}"`);
    expect(await render('/anime', BLOG('https://coverartarchive.org/release-group/x/front-500'))).toContain('src="https://coverartarchive.org/release-group/x/front-500"');
  });

  it('kpop and the hub (no base path): the same paths as before', async () => {
    expect(await render(undefined, DEBATE)).toContain('src="/mascot/mascot-default.png"');
    expect(await render(undefined, BLOG('/idols/BTS.jpg'))).toContain('src="/idols/BTS.jpg"');
    expect(await render(undefined, THREAD('/x/photo.jpg'))).toContain('src="/x/photo.jpg"');
  });
});
