import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The rules of the lot on its own files: no en or em dash, no emoji, no link written by hand, no write to the database.
const DIR = fileURLToPath(new URL('./', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
const source = (f: string): string => readFileSync(`${DIR}${f}`, 'utf8');
const prod = files.filter((f) => !f.endsWith('.test.ts') && f !== 'test-support.ts');

// Built from code points so this file holds neither dash.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const EMOJI = /\p{Extended_Pictographic}/u;

describe('the files of the home data', () => {
  it('has the modules of the brief', () => {
    for (const f of ['hot', 'daily', 'blindtest', 'debate', 'rotation', 'sixty-seconds', 'did-you-know', 'for-you', 'start-easy', 'surprise', 'crossover', 'top-fans', 'doors']) {
      expect(files).toContain(`${f}.ts`);
    }
  });

  it('uses no en dash, em dash or emoji, in code, comments or copy', () => {
    for (const f of files) {
      expect(source(f), f).not.toMatch(DASHES);
      expect(source(f), f).not.toMatch(EMOJI);
    }
  });

  it('writes no site address: every link is built from the origins of the registry', () => {
    for (const f of prod) {
      const code = source(f).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
      expect(code, f).not.toMatch(/https?:\/\/(?:www\.)?(?:kpopquiz|otakuquiz|fanquiz|fandomverse|bunnyverse)/i);
    }
  });

  it('only reads: no insert, update, delete, upsert or rpc', () => {
    for (const f of prod) {
      const code = source(f);
      expect(code, f).not.toMatch(/\.(insert|update|upsert|delete)\(/);
      expect(code, f).not.toMatch(/\.rpc\(/);
    }
  });

  it('uses the service role only where the table is closed (Team list, memberships, preferences)', () => {
    const users = prod.filter((f) => /createServiceRoleClient/.test(source(f).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')));
    expect(users).toEqual(['top-fans.ts']);
  });

  it('the rollback of the XP snapshots refuses to drop past days, before it drops anything', () => {
    const sql = readFileSync(fileURLToPath(new URL('../../../../../../../docs/pending-migrations/hub/002-xp-daily-snapshots.rollback.sql', import.meta.url)), 'utf8');
    const guard = sql.indexOf("where day < (now() at time zone ''utc'')::date");
    expect(guard).toBeGreaterThan(-1);
    expect(sql.indexOf('raise exception')).toBeGreaterThan(guard);
    expect(sql.indexOf('drop table')).toBeGreaterThan(sql.indexOf('raise exception'));
    expect(sql.indexOf('drop function')).toBeGreaterThan(sql.indexOf('raise exception'));
  });

  it('never throws at the page: every get* goes through hubCached', () => {
    for (const f of prod.filter((x) => !['rotation.ts', 'surprise-pick.ts'].includes(x))) {
      const code = source(f);
      if (/export async function get[A-Z]/.test(code)) expect(code, f).toContain('hubCached(');
    }
  });
});
