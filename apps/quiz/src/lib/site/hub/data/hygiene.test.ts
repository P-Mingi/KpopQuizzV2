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
      expect(code, f).not.toMatch(/https?:\/\/(?:www\.)?(?:kpopquiz|otakuquiz|fanquiz)/i);
    }
  });

  it('only reads: no insert, update, delete or upsert, and the only rpc is the idempotent daily blind test', () => {
    for (const f of prod) {
      const code = source(f);
      expect(code, f).not.toMatch(/\.(insert|update|upsert|delete)\(/);
      for (const m of code.matchAll(/\.rpc\(\s*'([a-z_]+)'/g)) expect(m[1], f).toBe('ensure_daily_blindtest');
    }
  });

  it('never throws at the page: every get* goes through hubCached', () => {
    for (const f of prod.filter((x) => !['rotation.ts', 'surprise-pick.ts'].includes(x))) {
      const code = source(f);
      if (/export async function get[A-Z]/.test(code)) expect(code, f).toContain('hubCached(');
    }
  });
});
