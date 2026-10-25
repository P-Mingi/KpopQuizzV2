// Mission U, part C. The Verse song page of a soundtrack song (drama, film, series OST) shows the
// existing no-cover disc instead of the show's key art, and nothing else on the page changes: its HTML
// equals the page of the same song with no stored cover. An ordinary song keeps its cover (the
// mission's look-alike album names included), before the SQL (column missing) and after it, and a song
// switched on by hand (songs.hide_cover) loses its cover too. Supabase and the space are fakes; real
// album names and Deezer ids; no server, no write.

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound'); },
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/verse/v/songs/x',
}));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const fake = vi.hoisted(() => ({
  song: null as Record<string, unknown> | null,
  switches: { data: [] as unknown[] | null, error: null as { message: string; code: string } | null },
}));
function chain(table: string): unknown {
  let cols = '';
  const listAnswer = (): unknown => (table === 'songs' && cols.includes('hide_cover') ? fake.switches : { data: [], error: null });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(listAnswer()).then(res);
      if (prop === 'select') return (c: string) => { cols = c; return proxy; };
      if (prop === 'range') return () => Promise.resolve(listAnswer());
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
  getSpace: async () => ({ group: { id: 53, name: 'V', fandom_name: 'ARMY' }, albums: [] }),
}));
vi.mock('@/lib/verse/pages/data', () => ({ listPublishedPages: async () => [] }));

const COVER_BIG = 'https://cdn-images.dzcdn.net/images/cover/show-art/500x500.jpg';
const COVER_MED = 'https://cdn-images.dzcdn.net/images/cover/show-art/250x250.jpg';
const ID = '931eb2d9-0f16-4328-9090-3cca26ccce23';
const row = (deezer: number, album: string, covers: boolean): Record<string, unknown> => ({
  id: ID, deezer_track_id: deezer, title: 'Christmas Tree', artist_name: 'V', album_name: album,
  album_cover_medium: covers ? COVER_MED : null, album_cover_big: covers ? COVER_BIG : null,
  duration: 200, year: 2021, language: 'ko', group_id: 53,
});

async function render(song: Record<string, unknown>): Promise<string> {
  fake.song = song;
  const { default: SongPage } = await import('./page');
  const el = await SongPage({ params: Promise.resolve({ slug: 'v', id: ID }) });
  return renderToStaticMarkup(el);
}

type Switches = typeof fake.switches;
const MISSING: Switches = { data: null, error: { message: 'column songs.hide_cover does not exist', code: '42703' } };
const NONE: Switches = { data: [], error: null };
const STATES: ReadonlyArray<[string, Switches]> = [['column missing', MISSING], ['column present, no switch', NONE]];

afterEach(() => { vi.resetModules(); fake.switches = { data: [], error: null }; });

describe('Verse song page: the soundtrack cover rule', () => {
  for (const [state, switches] of STATES) {
    it(`${state}: a drama OST song shows no cover, and the page equals its no-cover page`, async () => {
      fake.switches = switches;
      const album = 'Our Beloved Summer (Original Television Soundtrack), Pt. 5';
      const ost = await render(row(1597143482, album, true));
      expect(ost).not.toContain('show-art');
      expect(ost).not.toContain('cover art');
      expect(ost).toContain('<h1');
      expect(ost).toContain(album);
      vi.resetModules();
      expect(ost).toBe(await render(row(1597143482, album, false)));
    });

    it(`${state}: an ordinary song keeps its cover, look-alike names included`, async () => {
      fake.switches = switches;
      for (const album of ['Drama - The 4th Mini Album', 'LOST', 'Lost and Found', 'nostalgia', 'Ghost']) {
        vi.resetModules();
        const html = await render(row(2526016461, album, true));
        expect(html, album).toContain(`src="${COVER_BIG}"`);
        expect(html, album).toContain('cover art');
      }
    });
  }

  it('after the SQL: a song switched on by hand shows no cover', async () => {
    fake.switches = { data: [{ id: ID, hide_cover: true }], error: null };
    const html = await render(row(2526016461, 'Drama - The 4th Mini Album', true));
    expect(html).not.toContain('show-art');
  });
});
