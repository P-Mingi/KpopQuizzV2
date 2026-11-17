// Bunnyverse Cards lot 7 (production, 2026-11-17): 117 was refused with "the new body is not the expected one" because the owner pasted it from
// Windows: the line endings became CRLF, so md5(prosrc) of the body differed by bytes. Every md5 guard on a function body now folds
// whitespace ([ \t\n\r\f\v]+ becomes one space, then md5), in 117, 118 and both rollbacks. Proved on the production-like state: 117 and 118
// applied with CRLF line endings succeed, a second CRLF run says "already applied", the rollbacks work in CRLF, the corrected 117 is fine on a
// database where nothing of 117 is applied and on one where the 117 of #233 is applied, and the fingerprint is the same in TypeScript and Postgres.
import { execSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { MD5_BODY_SQL, SAFEUPDATE_DAY, buildSafeupdate, md5Normalized, normalizeBody } from './safeupdate-sql';
import { prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, one } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const crlf = (s: string): string => s.replace(/\n/g, '\r\n');
const fp = (db: Awaited<ReturnType<typeof prodDb>>, fn: string): Promise<string> =>
  one<string>(db, `select ${MD5_BODY_SQL} from pg_proc where oid = '${fn}'::regprocedure`);
const FNS = ['public.cards_build_catalog()', 'public.cards_catalog_append(boolean)',
  'public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)', 'public.cards_craft(uuid, text, integer, timestamptz, integer)'];

async function base103(): Promise<Awaited<ReturnType<typeof prodDb>>> {
  // the bundle, then 116 only (117 not applied)
  const { PGlite } = await import('@electric-sql/pglite');
  const { OUTPUTS, readCards } = await import('../../../scripts/cards/bundle-sql.mjs');
  const { prodStateSql } = await import('./bundle-fixture');
  const { at } = await import('./harvest-fixture');
  const db = new PGlite();
  for (const s of prodStateSql()) await db.exec(s);
  await db.exec(readCards(OUTPUTS.bundle));
  await db.exec(at(rd('116-photos-harvest.sql'), '12:00'));
  return db;
}

describe('the fingerprint of a body', () => {
  it('is the same in TypeScript and in Postgres, and blind to line endings and runs of blanks', async () => {
    const db = await prodDb();
    for (const f of FNS) {
      const body = await one<string>(db, `select prosrc from pg_proc where oid = '${f}'::regprocedure`);
      expect(await fp(db, f)).toBe(md5Normalized(body));
      expect(md5Normalized(crlf(body))).toBe(md5Normalized(body));
      expect(md5Normalized(body.replace(/ {2}/g, '\t \f'))).toBe(md5Normalized(body));
    }
    expect(normalizeBody('a \t\r\n\f\v b')).toBe('a b');
    expect(await one(db, `select regexp_replace(E'a \\t\\r\\n\\f\\v b', '[ \\t\\n\\r\\f\\v]+', ' ', 'g')`)).toBe('a b');
    // a changed word is still caught
    expect(md5Normalized('select 1')).not.toBe(md5Normalized('select 2'));
  });
});

describe('117 and 118 pasted with CRLF line endings', () => {
  it('117 applies in CRLF on a database where nothing of 117 is applied, says "already applied" the second time, and its rollback works in CRLF', async () => {
    const db = await base103();
    const S = buildSafeupdate(rd('103-catalog-photos.sql'), SAFEUPDATE_DAY);
    const old = await fp(db, FNS[0]!);
    expect(old).toBe(S.md5Old);
    expect(await run(db, crlf(S.sql))).toContain('117-catalog-safeupdate: cards_build_catalog() deletes with WHERE true; "Reconstruire le catalogue" works through the API');
    expect(await fp(db, FNS[0]!)).toBe(S.md5New);
    expect(await run(db, crlf(S.sql))).toEqual(['117-catalog-safeupdate: already applied, nothing changed']);
    await run(db, crlf(S.rollback));
    expect(await fp(db, FNS[0]!)).toBe(S.md5Old);
    expect(await run(db, crlf(S.rollback))).toEqual(["117-catalog-safeupdate.rollback: already 103's body, nothing changed"]);
    // and the committed file in LF still applies after it
    await run(db, rd('117-catalog-safeupdate.sql'));
    expect(await fp(db, FNS[0]!)).toBe(S.md5New);
  });

  it('the corrected 117 is accepted where the 117 of #233 is applied (same body, other fingerprint expression)', async () => {
    const db = await base103();
    // the body the 117 of #233 left: 103's with WHERE true
    const old117 = execSync('git show b6a06ce:docs/pending-migrations/cards/117-catalog-safeupdate.sql', { cwd: path.resolve(CARDS_SQL, '../../..') }).toString();
    await db.exec(old117.replace("(now() at time zone 'UTC')::time", "time '12:00'"));
    expect(await one(db, `select prosrc like '%delete from public.cards_catalog where true;%' from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure`)).toBe(true);
    const notices = await run(db, crlf(rd('117-catalog-safeupdate.sql')));
    expect(notices).toEqual(['117-catalog-safeupdate: already applied, nothing changed']);
  });

  it('118 applies in CRLF, says "already applied" the second time, and its rollback works in CRLF', async () => {
    const db = await prodDb();
    const before: string[] = [];
    for (const f of FNS) before.push(await fp(db, f));
    const t118 = rd('118-group-parts.sql');
    const notices = await run(db, crlf(t118));
    expect(notices.some((n) => /photos set to 2/.test(n))).toBe(true);
    for (const f of FNS) expect(await fp(db, f)).not.toBe(before[FNS.indexOf(f)]);
    expect(await run(db, crlf(t118))).toEqual(['118-group-parts: already applied, nothing changed']);
    expect(await one(db, `select count(*) from information_schema.columns where table_name = 'cards_photos' and column_name = 'parts'`)).toBe(1);
    await run(db, crlf(rd('118-group-parts.rollback.sql')));
    for (const f of FNS) expect(await fp(db, f)).toBe(before[FNS.indexOf(f)]);
    expect(await run(db, crlf(rd('118-group-parts.rollback.sql')))).toEqual(['118-group-parts.rollback: already rolled back, nothing changed']);
    // the Verify lines of 118 hold in LF after a fresh apply
    await run(db, t118);
    for (const line of t118.split('\n').filter((l) => l.startsWith('-- Verify:'))) {
      const m = /^-- Verify: (.*?);\s{3}expect (\S+)/.exec(line)!;
      const v = await one<unknown>(db, m[1]!);
      expect(String(v === true ? 't' : v === false ? 'f' : v), line).toBe(m[2]);
    }
  });
});
