// Run O1, lot (e) part 2, lane E1a: fixture to rows for scripts/anime/k1/load-fixtures.mjs.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FIXTURE_SITE, buildPlan, countPlan, countSql, quizLevel, renderSql, sqlText } from './fixture-load';
import { FIXTURE_SLUGS, readFixture } from './test-support';

import type { FixtureArc, FixtureQuiz, SeriesFixture } from './fixture-load';

const fixtures = (): SeriesFixture[] => FIXTURE_SLUGS.map((s) => readFixture(s) as unknown as SeriesFixture);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('buildPlan', () => {
  it('turns the three fixtures into 3 groups, 3 series and 15 quizzes with their children', () => {
    const plan = buildPlan(fixtures());
    const c = countPlan(plan);
    expect(c.groups).toBe(3);
    expect(c.series).toBe(3);
    expect(c.quizzes).toBe(15);
    expect(c.arcs).toBe(fixtures().reduce((n, f) => n + f.arcs.length, 0));
    expect(c.characters).toBe(fixtures().reduce((n, f) => n + f.characters.length, 0));
    expect(c.themes).toBe(fixtures().reduce((n, f) => n + f.themes.length, 0));
    expect(c.questions).toBe(plan.quizzes.reduce((n, q) => n + q.questions.length, 0));
  });

  it('computes every quiz level with computeSpoilerLevel and it equals expected_level', () => {
    const plan = buildPlan(fixtures());
    for (const f of fixtures()) {
      for (const q of f.quizzes) {
        const row = plan.quizzes.find((r) => r.slug === q.slug)!;
        expect(row.spoiler_arc_ord).toBe(q.expected_level.arc_ord);
        expect(row.spoiler_scope).toBe(q.expected_level.scope);
        expect(row.question_count).toBe(q.questions.length);
      }
    }
    // the fixtures cover level 0 and a level above 0
    expect(plan.quizzes.some((q) => q.spoiler_arc_ord === 0 && q.spoiler_scope === null)).toBe(true);
    expect(plan.quizzes.some((q) => q.spoiler_arc_ord > 0)).toBe(true);
  });

  it('refuses a quiz whose computed level differs from expected_level', () => {
    const f = fixtures()[0]!;
    const q = f.quizzes[0]! as FixtureQuiz;
    const bad = { ...q, expected_level: { arc_ord: q.expected_level.arc_ord + 1, scope: q.expected_level.scope } };
    expect(() => quizLevel(bad, f.arcs)).toThrow(/differs from expected_level/);
    expect(() => buildPlan([{ ...f, quizzes: [bad, ...f.quizzes.slice(1)] }])).toThrow(/differs from expected_level/);
  });

  it('counts a manga-only arc as the manga scope', () => {
    const arcs: FixtureArc[] = [{ ord: 1, name: 'A', kind: 'arc', status: 'published', manga_only: true }];
    const quiz: FixtureQuiz = {
      slug: 'fx-x', title: 'Some title', account: 'a', quiz_type: 'multiple_choice', difficulty: 'easy',
      questions: [{ question: 'q', spoiler: { arc: 1, scope: 'both' } }], expected_level: { arc_ord: 1, scope: 'manga' },
    };
    expect(quizLevel(quiz, arcs)).toEqual({ arcOrd: 1, scope: 'manga' });
  });

  it('refuses a duplicate slug and a bad slug', () => {
    const [a] = fixtures();
    expect(() => buildPlan([a!, a!])).toThrow(/duplicate group slug/);
    expect(() => buildPlan([{ ...a!, group: { ...a!.group, slug: 'Bad Slug' } }])).toThrow(/bad group slug/);
  });
});

describe('renderSql', () => {
  const sql = renderSql(buildPlan(fixtures()));

  it('is one transaction with a preflight and no statement outside the anime site', () => {
    expect(sql.startsWith('\\set ON_ERROR_STOP on\nbegin;')).toBe(true);
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
    expect(sql).toContain('apply SQL 011 first');
    expect(sql).not.toMatch(/\b(delete|truncate|drop)\b/i);
  });

  it('writes with an upsert on the natural key of every table', () => {
    const count = (re: RegExp): number => (sql.match(re) ?? []).length;
    expect(count(/^insert into public\.groups /gm)).toBe(3);
    expect(count(/^insert into public\.series /gm)).toBe(3);
    expect(count(/^insert into public\.quizzes /gm)).toBe(15);
    const inserts = sql.split('\n').filter((l) => l.startsWith('insert into'));
    expect(inserts.length).toBe(countInsertTotal());
    for (const l of inserts) expect(l).toMatch(/ on conflict \([a-z_, ]+\) do update set /);
    expect(sql).toContain('on conflict (slug) do update');
    expect(sql).toContain('on conflict (group_id, ord) do update');
    expect(sql).toContain('on conflict (group_id, slug) do update');
    expect(sql).toContain('on conflict (group_id, kind, number) do update');
  });

  it('sets site_id anime on groups and quizzes, published, with the level', () => {
    for (const l of sql.split('\n').filter((x) => x.startsWith('insert into public.quizzes'))) {
      expect(l).toContain(`'${FIXTURE_SITE}'`);
      expect(l).toContain("'published'");
      expect(l).toContain('where quizzes.site_id = \'anime\'');
    }
    for (const l of sql.split('\n').filter((x) => x.startsWith('insert into public.groups'))) {
      expect(l).toContain("'anime'");
      expect(l).toContain("where groups.site_id = 'anime'");
    }
  });

  it('fills the anime sites row only where empty', () => {
    expect(sql).toContain("update public.sites set system_user_id = (select id from public.profiles where username = 'otakuquiz_team') where id = 'anime' and system_user_id is null;");
    expect(sql).toContain("update public.sites set fallback_group_slug = 'anime-mix' where id = 'anime' and fallback_group_slug is null;");
  });

  it('is deterministic (the same plan renders the same script, so a second run writes the same rows)', () => {
    expect(renderSql(buildPlan(fixtures()))).toBe(sql);
  });

  it('keeps an apostrophe in a question as data (the script has balanced quotes)', () => {
    expect(sqlText("What's up, people?!")).toBe("'What''s up, people?!'");
    expect(sql).toContain("What''s up, people?!");
    expect(() => sqlText('a\u0000b')).toThrow();
  });

  it('shapes the proof query: seven counts, one statement', () => {
    const q = countSql(['death-note', 'one-piece', 'spy-x-family']);
    expect(q.match(/select count\(\*\)/g)?.length).toBe(7);
    expect(q.trimEnd().endsWith(';')).toBe(true);
  });
});

function countInsertTotal(): number {
  const c = countPlan(buildPlan(fixtures()));
  return c.groups + c.series + c.arcs + c.characters + c.themes + c.quizzes;
}

describe('load-fixtures.mjs', () => {
  const script = path.join(ROOT, 'scripts/anime/k1/load-fixtures.mjs');
  const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: ROOT });

  it('refuses any target other than scratch or dev', () => {
    for (const t of ['offline', 'prod', 'production', 'hub']) {
      const r = run(t);
      expect(r.status).toBe(2);
      expect(r.stderr).toContain('refused');
    }
    expect(run().status).toBe(2);
  });

  it('prints the row counts of a dry run and touches no database', () => {
    const r = run('scratch', '--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/groups=3 series=3 arcs=\d+ characters=\d+ themes=\d+ quizzes=15 questions=\d+ accounts=\d+/);
    expect(r.stdout).toContain('dry-run: nothing written');
  });
});
