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
