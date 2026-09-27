import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { STATIC_MODES } from '@/lib/blind-test-modes';

import { clampRound, modeRun, titleFromSlug } from './modes';
import { generateBody, isFixedPlaylist, playlistLabel } from './playlists';

// X1-001: every /blindtest/<mode> page starts a run generate serves, with the hub's body.

// generate's own list of general playlists, read from the route (any other id is a group slug there).
function servedGeneralPlaylists(): Set<string> {
  const src = fs.readFileSync(path.join(__dirname, '../../../app/api/blind-test/generate/route.ts'), 'utf8');
  const m = src.match(/const GENERAL_PLAYLISTS = new Set\(\[([\s\S]*?)\]\)/);
  if (!m) throw new Error('GENERAL_PLAYLISTS not found in the generate route');
  return new Set([...m[1]!.matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]!));
}

describe('mode runs (lib/ux-v1/p6/modes.ts)', () => {
  const served = servedGeneralPlaylists();

  it('reads generate\'s playlists', () => {
    expect(served.has('all')).toBe(true);
    expect(served.size).toBeGreaterThanOrEqual(10);
  });

  it.each(STATIC_MODES.map((m) => [m.id]))('%s plays a playlist generate serves, 5 to 15 songs, the hub\'s body', (id) => {
    const run = modeRun(id);
    expect(run).not.toBeNull();
    expect(served.has(run!.pick.playlist), `${id} -> ${run!.pick.playlist}`).toBe(true);
    expect(run!.count).toBeGreaterThanOrEqual(5);
    expect(run!.count).toBeLessThanOrEqual(15);
    expect(run!.pick.label.length).toBeGreaterThan(0);
    expect(isFixedPlaylist(run!.pick.playlist), 'challenge links accept the playlist').toBe(true);
    expect(generateBody(run!.pick, run!.count)).toEqual({ playlist: run!.pick.playlist, count: run!.count, mode: 'challenge' });
  });

  it('covers all 18 static modes', () => {
    expect(STATIC_MODES).toHaveLength(18);
    expect(STATIC_MODES.every((m) => modeRun(m.id) !== null)).toBe(true);
  });

  it('exact filters play their own playlist', () => {
    expect(modeRun('classic')!.pick).toEqual({ playlist: 'all', label: 'All K-pop' });
    expect(modeRun('random-all')!.pick).toEqual({ playlist: 'all', label: 'All K-pop' });
    expect(modeRun('2nd-gen')!.pick.playlist).toBe('2nd-gen');
    expect(modeRun('4th-gen')!.pick.playlist).toBe('4th-gen');
    expect(modeRun('girl-groups')!.pick.playlist).toBe('gg');
    expect(modeRun('boy-groups')!.pick.playlist).toBe('bg');
    expect(modeRun('solo-artists')!.pick.playlist).toBe('solo');
    for (const id of ['classic', '2nd-gen', '3rd-gen', '4th-gen', 'girl-groups', 'boy-groups', 'solo-artists', 'random-all']) {
      expect(modeRun(id)!.exact, id).toBe(true);
    }
  });

  it('a filter generate cannot serve plays the closest playlist, labelled with what it really plays', () => {
    expect(modeRun('speed-round')).toEqual({ pick: { playlist: 'all', label: 'All K-pop' }, count: 15, exact: false });
    expect(modeRun('intro-challenge')!.pick.label).toBe('All K-pop');
    expect(modeRun('4th-gen-gg')!.pick).toEqual({ playlist: '4th-gen', label: '4th gen' });
    expect(modeRun('b-sides')!.pick).toEqual({ playlist: 'deep', label: 'Deep cuts' });
    // generate's title-tracks pool is empty in the curated catalog (400, available 0).
    expect(modeRun('title-tracks')!.pick).toEqual({ playlist: 'hits', label: 'Hits' });
    for (const id of ['intro-challenge', 'verse-only', 'bridge-or-break', 'speed-round', 'title-tracks', 'b-sides', 'recent-hits', 'kpop-legends', '4th-gen-gg', '4th-gen-bg']) {
      expect(modeRun(id)!.exact, id).toBe(false);
    }
  });

  it('a group mode plays its group, labelled with its real name', () => {
    expect(modeRun('group-stray-kids', 'Stray Kids')).toEqual({ pick: { playlist: 'stray-kids', label: 'Stray Kids', group: 'stray-kids' }, count: 10, exact: true });
    expect(modeRun('group-bts', 'BTS')!.pick.label).toBe('BTS');
    // No name (the read failed): the page's own title.
    expect(modeRun('group-bts')!.pick.label).toBe('Bts');
    expect(modeRun('group-')).toBeNull();
    expect(modeRun('nope')).toBeNull();
  });

  it('labels and bounds', () => {
    expect(playlistLabel('solo')).toBe('Solo artists');
    expect(playlistLabel('deep')).toBe('Deep cuts');
    expect(playlistLabel('hits')).toBe('Hits');
    expect(titleFromSlug('stray-kids')).toBe('Stray Kids');
    expect([2, 5, 10, 15, 20].map(clampRound)).toEqual([5, 5, 10, 15, 15]);
  });
});
