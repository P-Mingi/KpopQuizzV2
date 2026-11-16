// Bunnyverse Cards: Supabase's safeupdate refuses, in the API's sessions (PostgREST), a DELETE or an UPDATE without WHERE, inside a function
// too (integrator, 2026-11-17: "Reconstruire le catalogue" answered 400 in production). This FAILS when a cards_* function holds one: the
// database is built as production is (bundle-fixture.ts, the bundle 099 to 115), then every later numbered file of
// docs/pending-migrations/cards (116, 117, the next ones: a file whose number has no letter), and every cards_* function of public is
// scanned (safeupdate-scan.ts). The service role calls them through PostgREST, so each one is in scope.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { prodStateSql } from './bundle-fixture';
import { at } from './harvest-fixture';
import { unguardedWrites } from './safeupdate-scan';
import { CARDS_SQL } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

describe('safeupdate-scan: what safeupdate refuses', () => {
  it('finds an UPDATE or a DELETE without its own WHERE, in code and in a dynamic statement', () => {
    const kinds = (s: string) => unguardedWrites(s).map((u) => u.kind);
    expect(kinds('begin delete from public.cards_catalog; end')).toEqual(['delete']);
    expect(kinds('begin update public.cards_wallets set stock = 5; end')).toEqual(['update']);
    expect(kinds('begin update public.cards_wallets w set stock = 5 from x; end')).toEqual(['update']);
    expect(kinds("begin execute 'delete from public.cards_idem'; end")).toEqual(['delete']);
    expect(kinds('begin execute $q$update public.cards_prefs set x = 1$q$; end')).toEqual(['update']);
    // a WHERE inside a subquery is not the statement's own
    expect(kinds('begin update public.t set a = (select b from u where u.id = 1); end')).toEqual(['update']);
    expect(kinds('begin delete from public.t using u; end')).toEqual(['delete']);
  });
  it('lets through what safeupdate lets through, and what is not a write', () => {
    for (const s of [
      'begin delete from public.cards_catalog where true; end',
      'begin update public.cards_wallets set stock = 5 where user_id = p_user; end',
      'begin update public.t set a = (select b from u) where id = 1; end',
      'begin delete from public.t using u where u.id = t.id; end',
      'begin perform 1 from public.cards_wallets where user_id = p_user for update; end',
      'begin select * into r from public.cards_wallets where user_id = p_user for no key update; end',
      'begin insert into public.t (a) values (1) on conflict (a) do update set a = excluded.a; end',
      "begin raise exception 'delete from public.cards_catalog is refused'; end",
      '-- delete from public.cards_catalog;\nbegin return; end',
      'begin update public.t set a = 1 where current of c; end',
    ]) expect(unguardedWrites(s), s).toEqual([]);
  });
});

describe('the cards_* functions of the database, as production builds them', () => {
  it('hold no UPDATE and no DELETE without a WHERE (they run through PostgREST, where safeupdate refuses it)', async () => {
    const db = new PGlite();
    for (const s of prodStateSql()) await db.exec(s);
    await db.exec(readCards(OUTPUTS.bundle));
    const later = readdirSync(CARDS_SQL).filter((f) => /^\d{3}-[a-z0-9-]+\.sql$/.test(f) && !f.endsWith('.rollback.sql') && Number(f.slice(0, 3)) >= 116).sort();
    expect(later).toEqual(expect.arrayContaining(['116-photos-harvest.sql', '117-catalog-safeupdate.sql']));
    for (const f of later) await db.exec(at(readFileSync(path.join(CARDS_SQL, f), 'utf8'), '12:00'));
    const fns = (await db.query<{ name: string; src: string }>(`select p.proname as name, p.prosrc as src from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%' order by 1`)).rows;
    expect(fns.length).toBeGreaterThan(40);
    const found = fns.flatMap((f) => unguardedWrites(f.src).map((u) => `${f.name}: ${u.kind} ${u.statement.slice(0, 80)}`));
    expect(found).toEqual([]);
  });
  it('without 117, the scan names cards_build_catalog (the DELETE of file 103)', async () => {
    const db = new PGlite();
    for (const s of prodStateSql()) await db.exec(s);
    await db.exec(readCards(OUTPUTS.bundle));
    const src = (await db.query<{ src: string }>(`select prosrc as src from pg_proc where proname = 'cards_build_catalog'`)).rows[0]!.src;
    expect(unguardedWrites(src).map((u) => u.statement)).toEqual(['delete from public.cards_catalog']);
  });
});
