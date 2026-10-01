import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

// The gate module pulls the Supabase server client through roles.ts; the pure
// helpers tested here never touch it.
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(), createServiceRoleClient: vi.fn() }));

import { spaceRefFrom, verseGateDecision } from './api-gate';

describe('verseGateDecision', () => {
  it('a hidden Verse lets a global admin write, and nobody else', () => {
    expect(verseGateDecision({ hidden: true, parked: null, admin: true })).toBe('allow');
    expect(verseGateDecision({ hidden: true, parked: null, admin: false })).toBe('deny');
    expect(verseGateDecision({ hidden: true, parked: false, admin: false })).toBe('deny');
  });

  it('a public Verse lets anyone write to a live space', () => {
    expect(verseGateDecision({ hidden: false, parked: false, admin: false })).toBe('allow');
    expect(verseGateDecision({ hidden: false, parked: null, admin: false })).toBe('allow');
  });

  it('a parked or unknown space is admin only, even with the Verse public', () => {
    expect(verseGateDecision({ hidden: false, parked: true, admin: false })).toBe('deny');
    expect(verseGateDecision({ hidden: false, parked: true, admin: true })).toBe('allow');
    expect(verseGateDecision({ hidden: false, parked: null, unknownSpace: true, admin: false })).toBe('deny');
  });
});

describe('spaceRefFrom', () => {
  const none = { groupId: null, slug: null, row: null, entity: null };

  it('reads the group id and the space slug a request names', () => {
    expect(spaceRefFrom({ group_id: 12, title: 'x' })).toEqual({ ...none, groupId: 12 });
    expect(spaceRefFrom({ groupId: '7' })).toEqual({ ...none, groupId: 7 });
    expect(spaceRefFrom({ groupSlug: 'bts' })).toEqual({ ...none, slug: 'bts' });
    expect(spaceRefFrom(null, new URLSearchParams('group_id=3&x=1'))).toEqual({ ...none, groupId: 3 });
  });

  it('reads the row a request names when it names no group', () => {
    expect(spaceRefFrom({ thread_id: 5, body: 'hi' }).row).toEqual({ table: 'verse_threads', id: 5 });
    expect(spaceRefFrom({ page_id: 9 }).row).toEqual({ table: 'verse_pages', id: 9 });
    expect(spaceRefFrom({ essay_id: '3' }).row).toEqual({ table: 'verse_essays', id: 3 });
    expect(spaceRefFrom({ poll_id: 2, option_index: 0 }).row).toEqual({ table: 'space_polls', id: 2 });
    expect(spaceRefFrom({ photocard_id: 8, state: 'have' }).row).toEqual({ table: 'photocards', id: 8 });
    expect(spaceRefFrom({ collectible_id: 4 }).row).toEqual({ table: 'collectibles', id: 4 });
  });

  it('reads a wiki entity', () => {
    expect(spaceRefFrom({ entity_type: 'album', entity_id: 41, section: 'intro' }).entity).toEqual({ type: 'album', id: '41' });
    expect(spaceRefFrom({ entity_type: 'song', entity_id: 'a1b2-uuid' }).entity).toEqual({ type: 'song', id: 'a1b2-uuid' });
    expect(spaceRefFrom({ entity_type: 'album' }).entity).toBeNull();
  });

  it('ignores a page slug, a bare id, junk ids and missing sources', () => {
    expect(spaceRefFrom({ slug: 'my-page', id: 4 })).toEqual(none);
    expect(spaceRefFrom({ group_id: 'abc' })).toEqual(none);
    expect(spaceRefFrom({ group_id: -1 })).toEqual(none);
    expect(spaceRefFrom({ group_id: 1.5 })).toEqual(none);
    expect(spaceRefFrom({ group_id: true, thread_id: null })).toEqual(none);
    expect(spaceRefFrom(null, undefined)).toEqual(none);
  });

  it('the body wins over the query', () => {
    expect(spaceRefFrom({ group_id: 2 }, new URLSearchParams('group_id=9')).groupId).toBe(2);
  });
});

// Guard: no /api/verse write handler without the gate as its first statement.
describe('/api/verse write routes', () => {
  const api = fileURLToPath(new URL('../../app/api/verse/', import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name === 'route.ts' ? [join(dir, e.name)] : [],
    );

  it('every POST / PUT / PATCH / DELETE handler starts with verseWriteGate(req)', () => {
    const missing: string[] = [];
    let handlers = 0;
    for (const file of walk(api)) {
      const text = readFileSync(file, 'utf8');
      const re = /^export async function (POST|PUT|PATCH|DELETE)\(req[^\n]*\{\n([^\n]*)\n([^\n]*)/gm;
      const declared = (text.match(/^export async function (POST|PUT|PATCH|DELETE)\b/gm) ?? []).length;
      let seen = 0;
      for (const m of text.matchAll(re)) {
        seen++;
        handlers++;
        if (!/const gated = await verseWriteGate\(req\);/.test(m[2]!) || !/if \(gated\) return gated;/.test(m[3]!)) {
          missing.push(`${file.slice(api.length)} ${m[1]}`);
        }
      }
      if (seen !== declared) missing.push(`${file.slice(api.length)} (a handler the guard could not read)`);
    }
    expect(missing).toEqual([]);
    expect(handlers).toBeGreaterThanOrEqual(64);
  });
});
