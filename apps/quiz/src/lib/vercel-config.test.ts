import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// apps/quiz/vercel.json is deployment configuration with no code path to test, so
// its rules are pinned here (R1: F8 agent branches, F9 / F10 cron routes).
const config = JSON.parse(readFileSync(fileURLToPath(new URL('../../vercel.json', import.meta.url)), 'utf8')) as {
  git?: { deploymentEnabled?: Record<string, boolean> };
  crons: { path: string; schedule: string }[];
};

// Vercel matches branch names with minimatch: `*` stays inside one path segment.
const matches = (pattern: string, branch: string): boolean =>
  new RegExp(`^${pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`).test(branch);

/** Vercel's rule: a branch deploys unless a matching rule says false and no matching rule says true. */
function deploys(branch: string): boolean {
  const rules = Object.entries(config.git?.deploymentEnabled ?? {}).filter(([p]) => matches(p, branch));
  return rules.length === 0 || rules.some(([, on]) => on);
}

describe('vercel.json: which branches build (F8)', () => {
  it('agent branches do not build', () => {
    for (const b of ['ux11/a0-fix8', 'ux11/p2-quizzes', 'w3/support', 'v12/g3-blindtest', 'v12/c1-check']) {
      expect(deploys(b), b).toBe(false);
    }
  });

  it('main, integration and release branches still build', () => {
    for (const b of ['main', 'feat/v12', 'feat/ux-v1-v11', 'r1/fixes', 'r1/report', 'preview/x', 'v12', 'ux11']) {
      expect(deploys(b), b).toBe(true);
    }
  });
});
