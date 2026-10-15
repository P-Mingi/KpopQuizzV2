import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { isCoverHidden, isKpdhTrack, KPDH_DEEZER_IDS, withoutHiddenCover, withoutKpdhCover } from '@/lib/blind-test-curated';

// Mission U, part C: withoutHiddenCover replaces withoutKpdhCover on every reveal. A soundtrack song
// loses both covers, an ordinary song is returned untouched (same object), a KPop Demon Hunters song
// behaves exactly as before, and songs.hide_cover is honoured when the row carries it. The manual
// switch is read in one guarded place (lib/song-cover-overrides.ts) that answers "no switch" while
// the column does not exist.

const covers = { album_cover_medium: 'https://cdn-images.dzcdn.net/images/cover/m/250x250.jpg', album_cover_big: 'https://cdn-images.dzcdn.net/images/cover/b/500x500.jpg' };
const KPDH_ALBUM = 'KPop Demon Hunters (Soundtrack from the Netflix Film)';

describe('withoutHiddenCover', () => {
  it('drops both covers of a drama OST song, without touching the input', () => {
    const ost = { deezer_track_id: 1597143482, title: 'Christmas Tree', album_name: 'Our Beloved Summer (Original Television Soundtrack), Pt. 5', ...covers };
    expect(withoutHiddenCover(ost)).toEqual({ ...ost, album_cover_medium: null, album_cover_big: null });
    expect(ost.album_cover_big).toBe(covers.album_cover_big);
    for (const album_name of ['Perfect Crown OST Part.4', 'Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series)']) {
      expect(withoutHiddenCover({ deezer_track_id: 1, album_name, ...covers })).toMatchObject({ album_cover_medium: null, album_cover_big: null });
    }
  });

  it('returns an ordinary song as is (same object), traps included', () => {
    for (const album_name of ['Drama - The 4th Mini Album', 'LOST', 'Lost and Found', 'nostalgia', 'Ghost', 'OST', null, undefined]) {
      const song = { deezer_track_id: 9001, album_name, ...covers };
      expect(withoutHiddenCover(song), String(album_name)).toBe(song);
    }
    const noAlbum = { deezer_track_id: 9001, ...covers };
    expect(withoutHiddenCover(noAlbum)).toBe(noAlbum);
  });

  it('a KPDH song behaves exactly like withoutKpdhCover, with or without an album name', () => {
    for (const id of KPDH_DEEZER_IDS) {
      for (const album_name of [KPDH_ALBUM, 'Album 1', undefined]) {
        const song = { deezer_track_id: id, album_name, ...covers };
        expect(withoutHiddenCover(song)).toEqual(withoutKpdhCover(song));
        expect(withoutHiddenCover(song)).toMatchObject({ album_cover_medium: null, album_cover_big: null });
      }
    }
  });

  it('the KPDH album keeps its id rule: another id on it keeps its cover, as before', () => {
    const other = { deezer_track_id: 9001, album_name: KPDH_ALBUM, ...covers };
    expect(isKpdhTrack(9001)).toBe(false);
    expect(withoutHiddenCover(other)).toBe(other);
    expect(withoutHiddenCover(other)).toEqual(withoutKpdhCover(other));
  });

  it('honours hide_cover = true on the row, and only true', () => {
    const base = { deezer_track_id: 9001, album_name: 'GOLDEN HOUR : Part.3', ...covers };
    expect(withoutHiddenCover({ ...base, hide_cover: true })).toMatchObject({ album_cover_medium: null, album_cover_big: null });
    for (const hide_cover of [false, null, undefined]) {
      const song = { ...base, hide_cover };
      expect(withoutHiddenCover(song)).toBe(song);
    }
    // A false switch never shows a soundtrack cover: the album name still hides it.
    expect(isCoverHidden({ deezer_track_id: 1, album_name: 'CART OST', hide_cover: false })).toBe(true);
  });

  it('withoutKpdhCover itself is unchanged: it ignores album names and the switch', () => {
    const ost = { deezer_track_id: 9001, album_name: 'CART OST', hide_cover: true, ...covers };
    expect(withoutKpdhCover(ost)).toBe(ost);
  });
});

// ---- the guarded read of songs.hide_cover ------------------------------------------------------

const db = vi.hoisted(() => ({
  reads: 0,
  throwOnCreate: false,
  answer: { data: [] as unknown[] | null, error: null as { message: string; code?: string } | null },
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    if (db.throwOnCreate) throw new Error('supabaseUrl is required.');
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) chain[m] = () => chain;
    chain.range = () => { db.reads += 1; return Promise.resolve(db.answer); };
    return { from: () => chain };
  },
}));

afterEach(() => {
  vi.resetModules();
  db.reads = 0;
  db.throwOnCreate = false;
  db.answer = { data: [], error: null };
});

describe('hiddenCoverSongIds (lib/song-cover-overrides.ts)', () => {
  it('before the SQL (column missing): no switch, and no throw', async () => {
    db.answer = { data: null, error: { message: 'column songs.hide_cover does not exist', code: '42703' } };
    const { hiddenCoverSongIds } = await import('./song-cover-overrides');
    expect([...(await hiddenCoverSongIds())]).toEqual([]);
  });

  it('no env (client constructor throws): no switch, and no throw', async () => {
    db.throwOnCreate = true;
    const { hiddenCoverSongIds } = await import('./song-cover-overrides');
    expect([...(await hiddenCoverSongIds())]).toEqual([]);
  });

  it('after the SQL: the ids whose hide_cover is strictly true', async () => {
    db.answer = { data: [{ id: 'a', hide_cover: true }, { id: 'b', hide_cover: false }, { id: 'c' }, { id: 'd', hide_cover: 'true' }, { id: 'e', hide_cover: true }], error: null };
    const { hiddenCoverSongIds } = await import('./song-cover-overrides');
    expect([...(await hiddenCoverSongIds())].sort()).toEqual(['a', 'e']);
  });

  it('one read per instance per 10 minutes, shared by concurrent callers', async () => {
    db.answer = { data: [{ id: 'a', hide_cover: true }], error: null };
    const { hiddenCoverSongIds } = await import('./song-cover-overrides');
    const [x, y] = await Promise.all([hiddenCoverSongIds(), hiddenCoverSongIds()]);
    await hiddenCoverSongIds();
    expect(db.reads).toBe(1);
    expect(x).toBe(y);
  });

  it('withCoverSwitch marks a switched-on row, keeps every other row as is', async () => {
    const { withCoverSwitch } = await import('./song-cover-overrides');
    const ids = new Set(['a']);
    const a = { id: 'a', deezer_track_id: 1 };
    const b = { id: 'b', deezer_track_id: 2 };
    const c = { id: 'c', deezer_track_id: 3, hide_cover: true };
    expect(withCoverSwitch(a, ids)).toEqual({ ...a, hide_cover: true });
    expect(withCoverSwitch(b, ids)).toBe(b);
    expect(withCoverSwitch(c, ids)).toBe(c);
    expect(withoutHiddenCover({ ...withCoverSwitch({ ...a, album_name: 'GOLDEN HOUR : Part.3' }, ids), ...covers })).toMatchObject({ album_cover_big: null });
  });
});

describe('fail soft by construction: no select list names hide_cover', () => {
  it('the guarded reader is the only select of the column in app code', () => {
    const src = fileURLToPath(new URL('..', import.meta.url));
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && /\.select\(\s*['"`][^'"`]*hide_cover/.test(readFileSync(p, 'utf8'))) hits.push(relative(src, p));
      }
    };
    walk(src);
    expect(hits).toEqual(['lib/song-cover-overrides.ts']);
  });
});
