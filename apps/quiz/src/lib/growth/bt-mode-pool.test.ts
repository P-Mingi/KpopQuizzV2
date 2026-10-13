import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STATIC_MODES } from '@/lib/blind-test-modes';
import { staticPlaylistFor } from '@/lib/ux-v1/p6/modes';

import { DUPLICATE_MODES, isDuplicateMode, legacyFilter, POOL_ARTISTS_SHOWN, POOL_SONGS_SHOWN, summarizePool } from './bt-mode-pool';

// The pool listed on a /blindtest/<mode> page is the pool its Play button plays
// (owner, 2026-10-13: SEO). The legacy filters are mirrored from generate's route, which
// cannot export them: this reads the route source so the two cannot drift apart.

const ROUTE = readFileSync(join(__dirname, '../../app/api/blind-test/generate/route.ts'), 'utf8');

describe('legacyFilter mirrors generate', () => {
  it.each([
    ['gg', "case 'gg': applyPlaylist = (q) => q.eq('gender', 'gg');"],
    ['bg', "case 'bg': applyPlaylist = (q) => q.eq('gender', 'bg');"],
    ['solo', "case 'solo': applyPlaylist = (q) => q.in('gender', ['solo_female', 'solo_male']);"],
    ['title-tracks', "case 'title-tracks': applyPlaylist = (q) => q.eq('is_title_track', true);"],
    ['hits', "case 'hits': applyPlaylist = (q) => q.in('tier', ['iconic', 'popular']);"],
    ['deep', "case 'deep': applyPlaylist = (q) => q.in('tier', ['medium', 'hard', 'unknown']);"],
  ])('%s', (id, line) => {
    expect(ROUTE).toContain(line);
    expect(legacyFilter(id)).not.toBeUndefined();
  });
  it('generations, all, and an unknown id', () => {
    expect(ROUTE).toContain("'1st-gen': '1st', '2nd-gen': '2nd', '3rd-gen': '3rd', '4th-gen': '4th', '5th-gen': '5th'");
    expect(legacyFilter('3rd-gen')).toEqual({ col: 'generation', values: ['3rd'] });
    expect(legacyFilter('all')).toBeNull();
    expect(legacyFilter('stray-kids')).toBeUndefined();
  });
  it('every playlist a static mode plays has a known pool', () => {
    for (const m of STATIC_MODES) {
      for (const v12 of [false, true]) {
        const served = staticPlaylistFor(m.id, v12);
        if (!served || (v12 && served.playlist === m.id)) continue; // a v12 playlist reads its spec
        expect(legacyFilter(served.playlist), `${m.id} -> ${served.playlist}`).not.toBeUndefined();
      }
    }
  });
});

describe('duplicate modes', () => {
  it('only modes that play the classic pool point at classic', () => {
    for (const id of DUPLICATE_MODES) expect(staticPlaylistFor(id, true)?.playlist).toBe('all');
    expect(isDuplicateMode('classic')).toBe(false);
    expect(isDuplicateMode('girl-groups')).toBe(false);
  });
});

describe('summarizePool', () => {
  const row = (title: string, artist: string, group_id: number | null, deezer_rank: number) => ({ title, artist_name: artist, group_id, deezer_rank });
  it('best known songs first, one per title and artist; artists by song count', () => {
    const p = summarizePool([
      row('Super Shy', 'NewJeans', 1, 900), row('Ditto', 'NewJeans', 1, 950), row('Ditto', 'NewJeans', 1, 100),
      row('Next Level', 'aespa', 2, 800), row('  ', 'aespa', 2, 999), row('Solo', 'JENNIE', null, 700),
    ]);
    expect(p.total).toBe(6);
    expect(p.songs.map((s) => s.title)).toEqual(['Ditto', 'Super Shy', 'Next Level', 'Solo']);
    expect(p.artists[0]).toEqual({ name: 'NewJeans', songs: 3, groupId: 1 });
  });
  it('caps both lists', () => {
    const rows = Array.from({ length: 40 }, (_, i) => row(`Song ${i}`, `Artist ${i}`, i, i));
    const p = summarizePool(rows);
    expect(p.songs).toHaveLength(POOL_SONGS_SHOWN);
    expect(p.artists).toHaveLength(POOL_ARTISTS_SHOWN);
  });
});
