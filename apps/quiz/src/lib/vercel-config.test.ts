import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

// apps/quiz/vercel.json is deployment configuration with no code path to test, so
// its rules are pinned here (R1: F8 agent branches, F9 / F10 cron routes).
const config = JSON.parse(readFileSync(fileURLToPath(new URL('../../shared.vercel.json', import.meta.url)), 'utf8')) as {
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

// Owner, 2026-10-29 (Vercel cost): only main and preview/<topic> deploy; o1/integration also deployed until launch day (K5b,
// 2026-11-07) and no longer does. Every other branch is checked locally.
describe('vercel.json: which branches build (F8, owner 2026-10-29)', () => {
  it('agent, integration and release branches do not build', () => {
    for (const b of ['ux11/a0-fix8', 'ux11/p2-quizzes', 'w3/support', 'v12/g3-blindtest', 'v12/c1-check', 'feat/v12', 'feat/ux-v1-v11', 'r1/fixes', 'r1/report', 'v12', 'ux11', 'o1/fv-int', 'o1/vercel-builds', 'o1/integration']) {
      expect(deploys(b), b).toBe(false);
    }
  });

  it('main and preview/** build', () => {
    for (const b of ['main', 'preview/x', 'preview/anime-home', 'preview/hub/mobile']) {
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

// 48 bis (2026-11-07): the three projects share shared.vercel.json, and vercel.ts gives each one its configuration. The anime
// crons carry the base path, because the Microfrontends group serves a path outside /anime on otakuquiz's own domains with the
// default app (fandomverse), so /api/cron/x never reached the anime code. kpop and the hub get the shared file as it is.
describe('vercel.ts: the configuration of each project', () => {
  it('kpop (no site id) and the hub: exactly the shared file, so no /anime cron on kpopquiz and none added to the hub', async () => {
    const { vercelConfigFor, vercelSiteOf } = await import('../../vercel');
    expect(vercelSiteOf({})).toBe('kpop');
    expect(vercelSiteOf({ SITE_ID: 'hub' })).toBe('hub');
    expect(vercelSiteOf({ NEXT_PUBLIC_SITE_ID: ' anime ', SITE_ID: 'anime' })).toBe('anime');
    for (const site of ['kpop', 'hub']) {
      const c = vercelConfigFor(config as never, site);
      expect(c, site).toEqual(config);
      expect(c.crons.some((x) => x.path.startsWith('/anime')), site).toBe(false);
    }
  });

  it('anime: every cron of the shared file, same schedule, under the base path of the anime site, and nothing else changes', async () => {
    const { vercelConfigFor, ANIME_BASE_PATH } = await import('../../vercel');
    const { basePathOf } = await import('./site/base-path');
    const { REGISTRY } = await import('./site/registry');
    expect(ANIME_BASE_PATH).toBe(basePathOf(REGISTRY.anime.url));
    const c = vercelConfigFor(config as never, 'anime');
    expect(c.crons).toEqual(config.crons.map((x) => ({ path: `/anime${x.path}`, schedule: x.schedule })));
    expect({ ...c, crons: [] }).toEqual({ ...config, crons: [] });
    expect(config.crons.length).toBeGreaterThan(0);
  });

  it('the exported config follows the site of the build', async () => {
    for (const [env, prefix] of [[{}, '/api/'], [{ NEXT_PUBLIC_SITE_ID: 'hub' }, '/api/'], [{ NEXT_PUBLIC_SITE_ID: 'anime' }, '/anime/api/']] as const) {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv('NEXT_PUBLIC_SITE_ID', '');
      vi.stubEnv('SITE_ID', '');
      for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const { config: built } = await import('../../vercel');
      expect(built.crons.length).toBe(config.crons.length);
      for (const x of built.crons) expect(x.path.startsWith(prefix), `${JSON.stringify(env)} ${x.path}`).toBe(true);
      expect(built.ignoreCommand).toBe('bash scripts/vercel-ignore-build.sh');
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('there is no vercel.json next to vercel.ts (Vercel takes one or the other)', () => {
    expect(existsSync(fileURLToPath(new URL('../../vercel.json', import.meta.url)))).toBe(false);
    expect(existsSync(fileURLToPath(new URL('../../vercel.ts', import.meta.url)))).toBe(true);
  });
});
