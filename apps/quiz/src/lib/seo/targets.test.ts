import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { TARGET_CLUSTERS, isLivePage, parseTargetsMarkdown } from './targets';

// SEO Mission 3, part F.4: /llms.txt lists the live cluster owners from lib/seo/targets.ts.
// docs/seo/TARGETS.md is the source of truth (rulebook section 1); when it exists, the live
// pages of both must be the same set, so llms.txt never advertises a page TARGETS.md does not
// own, nor misses one it does.

const TARGETS_MD = fileURLToPath(new URL('../../../../../docs/seo/TARGETS.md', import.meta.url));

const FIXTURE = `# TARGETS

| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |
|---|---|---|---|---|---|---|---|
| kpop quiz | kpop quiz, quiz kpop | / | play K-pop quizzes | en | x | clicks | live |
| kpop games | kpop games | /kpop-games | find and play free K-pop games | en | x | share | ready (branch seo/m2-kpop-games, not merged) |
| {group} games | {group} games | section "{Group} games" of /{group}-quiz (#games) | play every game | en | x | citations | live |
| kpop test | kpop test | /kpop-test | test K-pop knowledge | en | x | share | planned |

## Rules
- one cluster, one URL
`;

describe('parseTargetsMarkdown', () => {
  it('reads the cluster, URL and status columns by header name', () => {
    const rows = parseTargetsMarkdown(FIXTURE);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ cluster: 'kpop quiz', url: '/', status: 'live' });
    expect(rows[1]!.status.startsWith('ready')).toBe(true);
  });

  it('counts only live rows that own a path as pages', () => {
    const live = parseTargetsMarkdown(FIXTURE).filter(isLivePage).map((r) => r.url);
    expect(live).toEqual(['/']);
  });

  it('returns nothing for a file without the table', () => {
    expect(parseTargetsMarkdown('# nothing here')).toEqual([]);
  });
});

describe('TARGET_CLUSTERS', () => {
  it('has one row per URL', () => {
    const urls = TARGET_CLUSTERS.map((t) => t.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it.skipIf(!existsSync(TARGETS_MD))('matches the live pages of docs/seo/TARGETS.md', () => {
    const fromDoc = parseTargetsMarkdown(readFileSync(TARGETS_MD, 'utf8')).filter(isLivePage).map((r) => r.url).sort();
    const fromCode = TARGET_CLUSTERS.filter(isLivePage).map((t) => t.url).sort();
    expect(fromDoc.length).toBeGreaterThan(0);
    expect(fromCode).toEqual(fromDoc);
  });
});
