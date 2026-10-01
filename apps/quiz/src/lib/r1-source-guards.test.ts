import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Source guards from the R1 release (2026-10): each one pins a fix that has no
// natural unit to test, by scanning src for the thing that must not come back.
const src = fileURLToPath(new URL('../', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
const files = walk(src).map((f) => ({ path: f.slice(src.length), text: readFileSync(f, 'utf8') }));
const filesWith = (re: RegExp): string[] => files.filter((f) => re.test(f.text)).map((f) => f.path);

describe('F4: leaderboards show real accounts only', () => {
  it('the weekly padding module is gone and nothing invents accounts', () => {
    expect(existsSync(join(src, 'lib/weekly-leaderboard-padding.ts'))).toBe(false);
    expect(filesWith(/weekly-leaderboard-padding|padWeeklyLeaderboard|FAKE_USERS/)).toEqual([]);
  });

  it('/pt/leaderboard hands the fetched weekly rows straight to the tabs', () => {
    const page = files.find((f) => f.path === 'app/(site)/pt/leaderboard/page.tsx')!.text;
    expect(page).toMatch(/const \[weekly, allTime, topPlayers\] = await Promise\.all\(/);
    expect(page).toMatch(/<LeaderboardTabs weekly=\{weekly\}/);
  });
});

describe('F5: no link to the two listing URLs that never existed', () => {
  it('nothing links /quizzes/new or /quizzes/most-liked (the pages are /new and /most-liked)', () => {
    expect(filesWith(/["'`]\/quizzes\/(new|most-liked)["'`?#/]/)).toEqual([]);
    expect(existsSync(join(src, 'app/(site)/new/page.tsx'))).toBe(true);
    expect(existsSync(join(src, 'app/(site)/most-liked/page.tsx'))).toBe(true);
  });

  it('the home "See all" links point at the real pages', () => {
    const home = files.find((f) => f.path === 'app/(site)/page.tsx')!.text;
    expect(home).toContain('<Link href="/new" style={SEE_ALL}>');
    expect(home).toContain('<Link href="/most-liked" style={SEE_ALL}>');
  });
});

describe('F3: tables without a public write policy are written by the server only', () => {
  it('the challenge route inserts its battles row with the service role', () => {
    const route = files.find((f) => f.path === 'app/api/ux-v1/p4/challenge/route.ts')!.text;
    expect(route).toMatch(/await createServiceRoleClient\(\)\s*\.from\('battles'\)\s*\.insert\(/);
    expect(route).not.toMatch(/await auth\s*\.from\('battles'\)/);
  });

  it('quiz_time_stats is written only through lib/quiz/time-stats.ts, with the service client', () => {
    const writers = files.filter((f) => /from\('quiz_time_stats'\)\s*\.(insert|update|upsert|delete)\(/.test(f.text)).map((f) => f.path);
    expect(writers).toEqual(['lib/quiz/time-stats.ts']);
    const play = files.find((f) => f.path === 'app/api/quiz/[id]/play/route.ts')!.text;
    expect(play).toContain('await recordTimeSample(admin, id, sample)');
  });

  it('no browser code touches the four tables', () => {
    const tables = /from\('(ranked_plays|battles|quiz_bank|quiz_time_stats)'\)/;
    const clientFiles = files.filter((f) => /^['"]use client['"]/.test(f.text.trimStart()) && tables.test(f.text)).map((f) => f.path);
    expect(clientFiles).toEqual([]);
  });

  it('every quiz_bank and ranked_plays access is service-role or admin code', () => {
    const users = files.filter((f) => /from\('(quiz_bank|ranked_plays)'\)/.test(f.text));
    for (const f of users) {
      expect(/createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY|QotdStore|SupabaseClient/.test(f.text), f.path).toBe(true);
    }
  });
});

describe('F7: no profile is prerendered at build time', () => {
  it('/u/[username] hands no params to the build and stays ISR', () => {
    const page = files.find((f) => f.path === 'app/(site)/u/[username]/page.tsx')!.text;
    expect(page).toMatch(/export async function generateStaticParams\(\): Promise<Array<\{ username: string \}>> \{\n  return \[\];\n\}/);
    expect(page).toMatch(/export const revalidate = 3600;/);
    expect(page).not.toMatch(/TOP_PRERENDER/);
  });
});

describe('F10: season rewards stay hidden until they exist', () => {
  it('the ranked page renders the section behind SEASON_REWARDS_LIVE, which is off', () => {
    const page = files.find((f) => f.path === 'app/(site)/blindtest/ranked/page.tsx')!.text;
    expect(page).toContain('{SEASON_REWARDS_LIVE ? <SeasonRewards /> : null}');
    const constants = files.find((f) => f.path === 'lib/ranked/constants.ts')!.text;
    expect(constants).toMatch(/export const SEASON_REWARDS_LIVE = false;/);
  });

  it('ranked code never awards XP', () => {
    expect(files.filter((f) => /^(lib\/ranked|app\/api\/ranked)\//.test(f.path) && /award_xp|awardXp|awardSpaceXp/.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});

describe('R1 second pass: retired route, cron secret, battle_results writer', () => {
  it('/api/blind-test/play answers 410 and touches neither the database nor XP', () => {
    const route = files.find((f) => f.path === 'app/api/blind-test/play/route.ts')!.text;
    expect(route).toMatch(/status: 410/);
    expect(route).not.toMatch(/supabase|award_xp|\.from\(|request\.json/);
    expect(filesWith(/fetch\(\s*['"`]\/api\/blind-test\/play/)).toEqual([]);
  });

  it('no route treats the x-vercel-cron header as a credential', () => {
    expect(files.filter((f) => f.path.startsWith('app/') && /x-vercel-cron|isVercelCron/.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it('every scheduled route, and every route that reads CRON_SECRET, goes through isCronAuthorized', () => {
    const cronRoutes = files.filter((f) => /^app\/api\/(cron\/[^/]+|ranked\/cron\/[^/]+)\/route\.ts$/.test(f.path));
    expect(cronRoutes.length).toBeGreaterThanOrEqual(12);
    for (const f of cronRoutes) expect(f.text, f.path).toContain('isCronAuthorized(req)');
    const readsSecret = files.filter((f) => f.path.startsWith('app/') && /CRON_SECRET/.test(f.text) && !/isCronAuthorized\(req\)/.test(f.text)).map((f) => f.path);
    expect(readsSecret).toEqual([]);
  });

  it('the challenge attempt route inserts battle_results with the service role', () => {
    const route = files.find((f) => f.path === 'app/api/ux-v1/p4/challenge/[id]/attempt/route.ts')!.text;
    expect(route).toMatch(/await createServiceRoleClient\(\)\.from\('battle_results'\)\.insert\(/);
    expect(route).not.toMatch(/await auth\.from\('battle_results'\)/);
    expect(route).toContain('user_id: user?.id ?? null');
  });

  it('battle_results and pending_questions are written by server code on the service role only', () => {
    const writers = files.filter((f) => /from\('(battle_results|pending_questions)'\)\s*\.(insert|update|upsert|delete)\(/.test(f.text));
    expect(writers.map((f) => f.path).sort()).toEqual(['app/api/claim-runs/route.ts', 'app/api/ux-v1/p4/challenge/[id]/attempt/route.ts']);
    for (const f of writers) expect(f.text, f.path).toContain('createServiceRoleClient');
  });
});
