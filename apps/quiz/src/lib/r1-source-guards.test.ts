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
