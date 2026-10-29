import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// apps/quiz/vercel.json is deployment configuration with no code path to test, so
// its rules are pinned here (R1: F8 agent branches, F9 / F10 cron routes).
const config = JSON.parse(readFileSync(fileURLToPath(new URL('../../vercel.json', import.meta.url)), 'utf8')) as {
  git?: { deploymentEnabled?: Record<string, boolean> };
  crons: { path: string; schedule: string }[];
};

// Vercel matches branch names with minimatch: `*` stays inside one path segment, `**` crosses them.
const escape = (s: string): string => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const matches = (pattern: string, branch: string): boolean =>
  new RegExp(`^${pattern.split('**').map((p) => p.split('*').map(escape).join('[^/]*')).join('.*')}$`).test(branch);

/** Vercel's rule: a branch deploys unless a matching rule says false and no matching rule says true. */
function deploys(branch: string): boolean {
  const rules = Object.entries(config.git?.deploymentEnabled ?? {}).filter(([p]) => matches(p, branch));
  return rules.length === 0 || rules.some(([, on]) => on);
}

// Owner, 2026-10-29 (Vercel cost): only main and preview/<topic> deploy, plus o1/integration until launch day (K5b);
// every other branch is checked locally.
describe('vercel.json: which branches build (F8, owner 2026-10-29)', () => {
  it('agent, integration and release branches do not build', () => {
    for (const b of ['ux11/a0-fix8', 'ux11/p2-quizzes', 'w3/support', 'v12/g3-blindtest', 'v12/c1-check', 'feat/v12', 'feat/ux-v1-v11', 'r1/fixes', 'r1/report', 'v12', 'ux11', 'o1/fv-int', 'o1/vercel-builds']) {
      expect(deploys(b), b).toBe(false);
    }
  });

  it('main, preview/** and o1/integration build', () => {
    for (const b of ['main', 'preview/x', 'preview/anime-home', 'preview/hub/mobile', 'o1/integration']) {
      expect(deploys(b), b).toBe(true);
    }
  });
});

describe('vercel.json: crons', () => {
  const app = fileURLToPath(new URL('../app/', import.meta.url));

  it('every scheduled path has a route file', () => {
    for (const cron of config.crons) {
      expect(existsSync(`${app}${cron.path.replace(/^\//, '')}/route.ts`), cron.path).toBe(true);
    }
  });

  it('the daily debate and the ranked nightly job are scheduled once a day (F9, F10)', () => {
    const at = (path: string): string | undefined => config.crons.find((c) => c.path === path)?.schedule;
    expect(at('/api/cron/ensure-daily-debate')).toBe('10 0 * * *');
    expect(at('/api/ranked/cron/nightly')).toBe('20 0 * * *');
    expect(at('/api/cron/quiz-corrections')).toBe('30 9 * * *');
    expect(new Set(config.crons.map((c) => c.path)).size).toBe(config.crons.length);
  });

  it('both new routes ask for the cron secret, and the ranked job skips while ranked cannot run', () => {
    const debate = readFileSync(`${app}api/cron/ensure-daily-debate/route.ts`, 'utf8');
    const nightly = readFileSync(`${app}api/ranked/cron/nightly/route.ts`, 'utf8');
    for (const src of [debate, nightly]) {
      expect(src).toContain('isCronAuthorized(req)');
      expect(src).not.toContain('x-vercel-cron');
    }
    expect(debate).toContain(".rpc('ensure_daily_debate')");
    for (const reason of ["skipped: 'flag_off'", "skipped: 'no_season'", 'skipped: e.reason']) expect(nightly).toContain(reason);
  });
});
