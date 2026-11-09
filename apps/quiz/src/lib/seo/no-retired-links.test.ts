// O1 audit 03 P2-6: no page links to the retired /games/name-all/<group> URLs (they answer 410 or 301, lib/seo/legacy-urls.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const ALLOWED = [/legacy-urls/, /prod-crawl/, /\.test\./, /route-allowlist/, /site\/routing/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? (n === 'node_modules' || n.startsWith('__') ? [] : files(p)) : /\.(tsx?|mts)$/.test(n) ? [p] : [];
  });
}

describe('retired /games/name-all links', () => {
  it('no source file writes a link to /games/name-all outside the redirect table and the tests', () => {
    const hits = files(SRC).filter((f) => !ALLOWED.some((a) => a.test(f))).filter((f) => readFileSync(f, 'utf8').includes('/games/name-all'));
    expect(hits.map((f) => f.slice(SRC.length))).toEqual([]);
  });
});
