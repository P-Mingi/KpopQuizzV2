// F6d (COMMON rule 10: KPop Demon Hunters is text and audio only). The Verse song page of a KPDH
// song (the two TWICE songs) shows the existing no-cover look instead of the film key art, and
// nothing else on the page changes: its HTML equals the page of the same song with no stored cover.
// Any other song keeps its cover. Supabase and the space are fakes; no server, no write.

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound'); },
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/verse/twice/songs/x',
}));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const fake = vi.hoisted(() => ({ song: null as Record<string, unknown> | null }));
function chain(table: string): unknown {
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
      if (prop === 'maybeSingle') return () => Promise.resolve({ data: table === 'songs' ? fake.song : null, error: null });
      return () => proxy;
    },
  });
  return proxy;
}
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({ from: (t: string) => chain(t) }),
  createServiceRoleClient: () => ({ from: (t: string) => chain(t) }),
  createServerClient: async () => ({ from: (t: string) => chain(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock('@/lib/verse/space', () => ({
  getSpace: async () => ({ group: { id: 7, name: 'TWICE', fandom_name: 'ONCE' }, albums: [] }),
}));
vi.mock('@/lib/verse/pages/data', () => ({ listPublishedPages: async () => [] }));

const COVER_BIG = 'https://cdn-images.dzcdn.net/images/cover/kpdh-art/500x500.jpg';
const COVER_MED = 'https://cdn-images.dzcdn.net/images/cover/kpdh-art/250x250.jpg';
const row = (deezer: number, covers: boolean): Record<string, unknown> => ({
  id: '44444444-4444-4444-8444-444444444444', deezer_track_id: deezer, title: 'Strategy', artist_name: 'TWICE',
  album_name: 'KPop Demon Hunters (Soundtrack from the Netflix Film)',
  album_cover_medium: covers ? COVER_MED : null, album_cover_big: covers ? COVER_BIG : null,
  duration: 160, year: 2025, language: 'en', group_id: 7,
});

async function render(song: Record<string, unknown>): Promise<string> {
  fake.song = song;
  const { default: SongPage } = await import('./page');
  const el = await SongPage({ params: Promise.resolve({ slug: 'twice', id: String(song.id) }) });
  return renderToStaticMarkup(el);
}

afterEach(() => { vi.resetModules(); });

describe('Verse song page: the KPDH cover rule', () => {
  it('a KPDH song shows no cover, and the page equals the no-cover page of the same song', async () => {
    const kpdh = await render(row(3412534591, true));
    expect(kpdh).not.toContain('kpdh-art');
    expect(kpdh).not.toContain('cover art');
    expect(kpdh).toContain('<h1');
    const noCover = await render(row(9001, false));
    expect(kpdh).toBe(noCover);
  });

  it('any other song keeps its cover', async () => {
    const html = await render(row(9001, true));
    expect(html).toContain(`src="${COVER_BIG}"`);
    expect(html).toContain('cover art');
  });
});
