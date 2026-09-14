import { describe, it, expect } from 'vitest';

import { shapeMembers, shapeAlbums, shapeTracks, coverArtUrl, orderAndCapMembers } from './bank-shape';

describe('bank read layer shaping (fixtures, no DB)', () => {
  it('members: photo_url or null, kind member, namespaced id', () => {
    const out = shapeMembers([
      { id: 1, name: 'Jimin', photo_url: 'https://x/jm.jpg' },
      { id: 2, name: 'V', photo_url: null },
    ]);
    expect(out).toEqual([
      { id: 'idol:1', kind: 'member', name: 'Jimin', image_url: 'https://x/jm.jpg' },
      { id: 'idol:2', kind: 'member', name: 'V', image_url: null },
    ]);
  });
  it('albums: cover from MBID, null when no mbid', () => {
    const out = shapeAlbums([
      { id: 5, title: 'Map of the Soul', musicbrainz_mbid: 'abc-123' },
      { id: 6, title: 'Demo', musicbrainz_mbid: null },
    ]);
    expect(out[0]).toEqual({ id: 'album:5', kind: 'album', name: 'Map of the Soul', image_url: coverArtUrl('abc-123') });
    expect(out[1]!.image_url).toBeNull();
    expect(coverArtUrl('abc-123')).toBe('https://coverartarchive.org/release-group/abc-123/front-500');
  });
  it('tracks: prefers big cover, falls back to medium then null', () => {
    const out = shapeTracks([
      { id: 'u1', title: 'Dynamite', album_cover_medium: 'm.jpg', album_cover_big: 'b.jpg' },
      { id: 'u2', title: 'Butter', album_cover_medium: 'm2.jpg', album_cover_big: null },
      { id: 'u3', title: 'Demo', album_cover_medium: null },
    ]);
    expect(out[0]!.image_url).toBe('b.jpg');
    expect(out[1]!.image_url).toBe('m2.jpg');
    expect(out[2]!.image_url).toBeNull();
    expect(out[0]!.id).toBe('song:u1');
  });
});

describe('all-bank members: order by group rank, photo-only, capped', () => {
  const rankById = new Map([[10, 0], [20, 1], [30, 2]]); // group 10 best-known
  const rows = [
    { id: 3, name: 'C', photo_url: 'c.jpg', group_id: 30 },
    { id: 1, name: 'A', photo_url: 'a.jpg', group_id: 10 },
    { id: 9, name: 'NoPhoto', photo_url: null, group_id: 10 },
    { id: 2, name: 'B', photo_url: 'b.jpg', group_id: 20 },
  ];
  it('orders best-known group first and drops photoless idols', () => {
    const out = orderAndCapMembers(rows, rankById, 100);
    expect(out.map((i) => i.id)).toEqual(['idol:1', 'idol:2', 'idol:3']); // 10,20,30; no photoless
    expect(out.every((i) => i.image_url)).toBe(true);
  });
  it('caps the pool', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `n${i}`, photo_url: 'p.jpg', group_id: 10 }));
    expect(orderAndCapMembers(many, rankById, 120)).toHaveLength(120);
  });
  it('unranked groups sink to the end', () => {
    const out = orderAndCapMembers(
      [{ id: 5, name: 'Z', photo_url: 'z.jpg', group_id: 999 }, { id: 1, name: 'A', photo_url: 'a.jpg', group_id: 10 }],
      rankById, 100,
    );
    expect(out[0]!.id).toBe('idol:1');
    expect(out[1]!.id).toBe('idol:5');
  });
});
