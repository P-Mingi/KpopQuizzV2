// Owner decision of 2026-10-25: one mailbox, hello@kpopquiz.org, the same on every site. The registry gives it; no file
// of the app (tests excluded) may name a contact@ or support@ address of any site.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MAILBOX, REGISTRY } from './registry';
import { SITE_IDS } from './types';

const SRC = join(__dirname, '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' || name === '.next' ? [] : files(p);
    return /\.test\.(ts|tsx)$/.test(name) ? [] : [p];
  });
}

describe('the one mailbox', () => {
  it('is hello@kpopquiz.org on every site, from the registry', () => {
    expect(MAILBOX).toBe('hello@kpopquiz.org');
    for (const id of SITE_IDS) expect(REGISTRY[id].seo.organization.email, id).toBe(MAILBOX);
  });

  it('no file under apps/quiz/src (tests excluded) contains contact@ or support@ (or a hello@ of another site)', () => {
    const offenders = files(SRC).filter((f) => /\b((contact|support)@|hello@(otakuquiz|fanquiz)\.org)/i.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });
});
