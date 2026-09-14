import { describe, it, expect } from 'vitest';

import { sanitizeBoard, customAssetIds, publishGate } from './publish';

// PART A gates: the pure publish-path helpers (no DB), which enforce the
// exactly-once + size invariants at the persistence boundary and the auth /
// moderation rules before any write.

const tiers = [{ label: 'S', color: '#E8457A', ord: 0 }, { label: 'A', color: '#F5894D', ord: 1 }];

describe('sanitizeBoard', () => {
  it('rejects an empty or missing title', () => {
    expect(sanitizeBoard({ title: '  ', tiers, placements: {}, visibility: 'private' }).ok).toBe(false);
  });
  it('rejects a board with no tiers', () => {
    expect(sanitizeBoard({ title: 'x', tiers: [], placements: {}, visibility: 'private' }).ok).toBe(false);
  });
  it('enforces exactly-once across buckets (first occurrence wins, dupes dropped)', () => {
    const r = sanitizeBoard({ title: 'BTS', tiers, placements: { S: ['a', 'a', 'b'], A: ['b', 'c'], junk: ['d'] }, visibility: 'public' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.board.placements['S']).toEqual(['a', 'b']);
    expect(r.board.placements['A']).toEqual(['c']); // 'b' already placed in S
    expect(r.board.placements).not.toHaveProperty('junk'); // unknown bucket dropped
    expect(r.board.placements['unranked']).toEqual([]);
  });
  it('rejects an oversized board', () => {
    const many = Array.from({ length: 600 }, (_, i) => `i${i}`);
    expect(sanitizeBoard({ title: 'x', tiers, placements: { S: many }, visibility: 'private' }).ok).toBe(false);
  });
  it('coerces a bad tier colour to grey and keeps a valid one', () => {
    const r = sanitizeBoard({ title: 'x', tiers: [{ label: 'S', color: 'red', ord: 0 }, { label: 'A', color: '#ABC', ord: 1 }], placements: {}, visibility: 'private' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.board.tiers[0]!.color).toBe('#9E998F');
    expect(r.board.tiers[1]!.color).toBe('#ABC');
  });
});

describe('customAssetIds', () => {
  it('extracts the custom asset ids referenced on a board', () => {
    expect(customAssetIds({ S: ['idol:1', 'custom:aaa'], A: ['custom:bbb', 'custom:aaa'] }).sort()).toEqual(['aaa', 'bbb']);
    expect(customAssetIds({ S: ['idol:1', 'song:2'] })).toEqual([]);
  });
});

describe('publishGate', () => {
  it('blocks a public publish with no signed-in creator (401)', () => {
    const g = publishGate({ visibility: 'public', userId: null, referencedAssetIds: [], assetStatuses: {} });
    expect(g).toEqual({ ok: false, status: 401, error: expect.any(String) });
  });
  it('blocks a public publish that uses a pending custom asset (409)', () => {
    const g = publishGate({ visibility: 'public', userId: 'u1', referencedAssetIds: ['a'], assetStatuses: { a: 'pending' } });
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.status).toBe(409);
  });
  it('allows a public publish when every custom asset is approved', () => {
    expect(publishGate({ visibility: 'public', userId: 'u1', referencedAssetIds: ['a', 'b'], assetStatuses: { a: 'approved', b: 'approved' } })).toEqual({ ok: true });
  });
  it('allows a logged-out unlisted save with a pending asset', () => {
    expect(publishGate({ visibility: 'unlisted', userId: null, referencedAssetIds: ['a'], assetStatuses: { a: 'pending' } })).toEqual({ ok: true });
  });
  it('blocks any save that uses a rejected asset (409)', () => {
    const g = publishGate({ visibility: 'private', userId: 'u1', referencedAssetIds: ['a'], assetStatuses: { a: 'rejected' } });
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.status).toBe(409);
  });
});
