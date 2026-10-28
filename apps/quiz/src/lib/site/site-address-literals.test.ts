// FandomVerse (review of 2026-10-28, finding 6): a page of the world and hub builds (app/sites/) names its site with
// siteAddress(SITE) of lib/site/brand.ts (fandomverse.org/anime, fandomverse.org, kpopquiz.org), never with the address written
// out: nine anime pages had 'fandomverse.org/anime' as text, which a move of the site would have left behind. This reads every
// code file under app/sites/ (tests excepted) and refuses a site address in a line of code. Not counted: a comment line, and an
// email address (hello@kpopquiz.org, the mailbox, is not the address of a site).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { siteAddress } from './brand';
import { REGISTRY } from './registry';
import { SITE_IDS } from './types';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const SITES = join(SRC, 'app/sites');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !/\.test-support\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** The bare domains of the network (kpopquiz.org, fandomverse.org), read from the registry: every address starts with one. */
const DOMAINS = [...new Set(SITE_IDS.map((id) => REGISTRY[id].domain))];
/** A domain as text, not the host of an email address and not a longer host name. */
const ADDRESS = new RegExp(`(?<![@\\w.-])(?:${DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|')})(?![\\w-])`, 'i');

describe('the pages of app/sites name their site with siteAddress(SITE)', () => {
  it('siteAddress is the address of each site of the registry, and the matcher sees every one of them', () => {
    expect(SITE_IDS.map((id) => siteAddress(REGISTRY[id]))).toEqual(['kpopquiz.org', 'fandomverse.org/anime', 'fandomverse.org']);
    for (const id of SITE_IDS) expect(ADDRESS.test(`Just visit ${siteAddress(REGISTRY[id])}/blindtest`), id).toBe(true);
    for (const miss of ['hello@kpopquiz.org', 'mailto:hello@kpopquiz.org', 'www.fandomverse.org.evil', 'notfandomverse.org']) expect(ADDRESS.test(miss), miss).toBe(false);
  });

  it('no site address written out in a line of code under app/sites/', () => {
    const files = walk(SITES);
    expect(files.length).toBeGreaterThan(40);
    const found: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) || !ADDRESS.test(line)) return;
        found.push(`${relative(SRC, f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(found).toEqual([]);
  });
});
