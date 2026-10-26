// Run O1 (OSHI): "Set as oshi" under a Which character are you result. The rules of the save (signed in, the series' own character, the
// spoiler rule, the two writes of the site) with the database replaced by a stand-in: nothing leaves the process.
import { describe, expect, it } from 'vitest';

import { OSHI_TAG_MAX, saveOshiFromResult } from './oshi-offer';

import type { OshiOfferDb } from './oshi-offer';

interface Rows {
  user: { id: string } | null;
  group: { id: number; name: string } | null;
  character: { id: number; slug: string; name: string; spoiler_level: number } | null;
  progress: { medium: string; arc_ord: number } | null;
  favouriteError?: unknown;
  memberError?: unknown;
}

function fake(rows: Rows): OshiOfferDb & { log: string[]; calls: Array<{ table: string; filters: Record<string, unknown> }>; rpcs: Array<{ fn: string; args: Record<string, unknown> }>; favs: Array<Record<string, unknown>> } {
  const log: string[] = [];
  const calls: Array<{ table: string; filters: Record<string, unknown> }> = [];
  const rpcs: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const favs: Array<Record<string, unknown>> = [];
  const read = (table: string) => {
    const filters: Record<string, unknown> = {};
    const q = {
      select: () => q,
      eq: (c: string, v: unknown) => { filters[c] = v; return q; },
      maybeSingle: async () => {
        log.push(`read ${table}`);
        calls.push({ table, filters });
        const data = table === 'groups' ? rows.group : table === 'characters' ? rows.character : table === 'series_progress' ? rows.progress : null;
        return { data, error: null };
      },
    };
    return q;
  };
  const db = {
    log, calls, rpcs, favs,
    auth: { getUser: async () => ({ data: { user: rows.user } }) },
    from: (table: string) => {
      if (table === 'favourite_characters') {
        return {
          upsert: async (row: Record<string, unknown>, opts: unknown) => { log.push('write favourite_characters'); favs.push({ ...row, opts }); return { error: rows.favouriteError ?? null }; },
          delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        };
      }
      return read(table);
    },
    rpc: async (fn: string, args: Record<string, unknown>) => { log.push(`rpc ${fn}`); rpcs.push({ fn, args }); return { error: fn === 'update_my_membership' ? rows.memberError ?? null : null }; },
  };
  return db as unknown as ReturnType<typeof fake>;
}

const base: Rows = {
  user: { id: 'u1' },
  group: { id: 7, name: 'Death Note' },
  character: { id: 70, slug: 'light-yagami', name: 'Light Yagami', spoiler_level: 0 },
  progress: null,
};
const args = { site: 'anime' as const, groupSlug: 'death-note', characterSlug: 'light-yagami' };

describe('saveOshiFromResult', () => {
  it('a signed-in fan: the oshi of the series (one favourite_characters row) and the tag of this site, nothing else', async () => {
    const db = fake(base);
    const r = await saveOshiFromResult(db, args);
    expect(r).toEqual({ ok: true, name: 'Light Yagami' });
    expect(db.favs).toEqual([{ user_id: 'u1', group_id: 7, character_id: 70, opts: { onConflict: 'user_id,group_id' } }]);
    expect(db.rpcs).toEqual([
      { fn: 'ensure_membership', args: { p_site: 'anime', p_via: 'signup', p_via_code: null } },
      { fn: 'update_my_membership', args: { p_site: 'anime', p_patch: { tag_text: 'Light Yagami' } } },
    ]);
    // the order of Settings: the series row first, then the membership
    expect(db.log.slice(-3)).toEqual(['write favourite_characters', 'rpc ensure_membership', 'rpc update_my_membership']);
  });

  it('reads the series and the character of this site only (site id on the series, group and slug on the character)', async () => {
    const db = fake(base);
    await saveOshiFromResult(db, args);
    expect(db.calls.find((c) => c.table === 'groups')?.filters).toEqual({ slug: 'death-note', site_id: 'anime' });
    expect(db.calls.find((c) => c.table === 'characters')?.filters).toEqual({ group_id: 7, slug: 'light-yagami' });
  });

  it('signed out: nothing is read or written', async () => {
    const db = fake({ ...base, user: null });
    const r = await saveOshiFromResult(db, args);
    expect(r).toMatchObject({ ok: false, reason: 'signed-out' });
    expect(db.log).toEqual([]);
  });

  it('a character above the spoiler progress is refused with the series words, and nothing is written', async () => {
    const db = fake({ ...base, character: { ...base.character!, spoiler_level: 4 } });
    const r = await saveOshiFromResult(db, args);
    expect(r).toMatchObject({ ok: false, reason: 'spoiler' });
    if (!r.ok) expect(r.message).toBe('You have not got that far in Death Note yet. Set how far you have got first, or pick someone you have already met.');
    expect(db.favs).toEqual([]);
    expect(db.rpcs).toEqual([]);
  });

  it('the same character is saved once the fan progress (series_progress) has reached it', async () => {
    const db = fake({ ...base, character: { ...base.character!, spoiler_level: 4 }, progress: { medium: 'anime', arc_ord: 4 } });
    expect(await saveOshiFromResult(db, args)).toEqual({ ok: true, name: 'Light Yagami' });
    expect(db.favs).toHaveLength(1);
  });

  it('an unknown series or character (a result that is not a character of the series) writes nothing', async () => {
    for (const rows of [{ ...base, group: null }, { ...base, character: null }]) {
      const db = fake(rows);
      const r = await saveOshiFromResult(db, args);
      expect(r).toMatchObject({ ok: false, reason: 'unknown' });
      expect(db.favs).toEqual([]);
      expect(db.rpcs).toEqual([]);
    }
  });

  it('a refused series write leaves the tag alone; a refused tag write is reported', async () => {
    const a = fake({ ...base, favouriteError: new Error('rls') });
    expect(await saveOshiFromResult(a, args)).toMatchObject({ ok: false, reason: 'error' });
    expect(a.rpcs).toEqual([]);
    const b = fake({ ...base, memberError: new Error('no row') });
    expect(await saveOshiFromResult(b, args)).toMatchObject({ ok: false, reason: 'error' });
  });

  it('a database that throws gives an error result, never a throw', async () => {
    const db = fake(base);
    db.auth.getUser = async () => { throw new Error('offline'); };
    expect(await saveOshiFromResult(db, args)).toMatchObject({ ok: false, reason: 'error' });
  });

  it('the tag is the character name, cut at the tag length of the membership', async () => {
    const long = 'A'.repeat(OSHI_TAG_MAX + 10);
    const db = fake({ ...base, character: { ...base.character!, name: long } });
    await saveOshiFromResult(db, args);
    expect((db.rpcs[1]!.args.p_patch as { tag_text: string }).tag_text).toBe('A'.repeat(OSHI_TAG_MAX));
  });

  it('never touches the shared profile: no write to profiles, no bias key anywhere in a write', async () => {
    const db = fake(base);
    await saveOshiFromResult(db, args);
    expect(db.log.filter((l) => l.startsWith('write') || l.startsWith('rpc')).join(' ')).not.toMatch(/profiles|bias/);
    expect(JSON.stringify([db.favs, db.rpcs])).not.toMatch(/bias/);
  });
});
