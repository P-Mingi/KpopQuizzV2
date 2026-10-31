// The Ignored Build Step of apps/quiz/vercel.json (scripts/vercel-ignore-build.sh), run on a throwaway git repository
// the way Vercel runs it: in apps/quiz, with the VERCEL_* variables of the deployment. Exit 0 skips, exit 1 builds.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = path.join(APP, 'scripts/vercel-ignore-build.sh');
const config = JSON.parse(readFileSync(path.join(APP, 'vercel.json'), 'utf8')) as { ignoreCommand: string };

const repo = mkdtempSync(path.join(tmpdir(), 'ignore-build-'));
afterAll(() => rmSync(repo, { recursive: true, force: true }));
const git = (...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' }).trim();
const put = (file: string, text: string): void => {
  mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  writeFileSync(path.join(repo, file), text);
};
/** Commits the files and returns the new SHA. */
const commit = (files: Record<string, string>, remove: string[] = []): string => {
  for (const [f, t] of Object.entries(files)) put(f, t);
  for (const f of remove) git('rm', '-q', f);
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', 'c');
  return git('rev-parse', 'HEAD');
};
/** Runs the script from apps/quiz of the repository and returns its exit code. */
const run = (env: Record<string, string>): number =>
  spawnSync('bash', [SCRIPT], { cwd: path.join(repo, 'apps/quiz'), env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', ...env } }).status ?? -1;

git('init', '-q');
const base = commit({ 'apps/quiz/package.json': '{}', 'docs/a.md': 'a', 'docs/data/w5-dataset.md': 'd', 'apps/quiz/src/x.ts': 'x' });
const deploy = (prev: string, head: string, extra: Record<string, string> = {}): number =>
  run({ VERCEL_ENV: 'preview', VERCEL_PROJECT_NAME: 'kpopquiz', VERCEL_GIT_PREVIOUS_SHA: prev, VERCEL_GIT_COMMIT_SHA: head, ...extra });

describe('vercel.json', () => {
  it('runs the script from apps/quiz', () => {
    expect(config.ignoreCommand).toBe('bash scripts/vercel-ignore-build.sh');
  });
});

describe('the Ignored Build Step', () => {
  it('skips a push of docs/, .md and .sql files only', () => {
    const head = commit({ 'docs/a.md': 'b', 'docs/o1/x.json': '{}', 'README.md': 'r', 'supabase/migrations/1.sql': 's' });
    expect(deploy(base, head)).toBe(0);
  });
  it('builds as soon as one other file changed', () => {
    const prev = git('rev-parse', 'HEAD');
    expect(deploy(prev, commit({ 'docs/b.md': 'b', 'apps/quiz/src/x.ts': 'y' }))).toBe(1);
  });
  it('builds a change of docs/data/, served at runtime', () => {
    const prev = git('rev-parse', 'HEAD');
    expect(deploy(prev, commit({ 'docs/data/w5-dataset.md': 'e' }))).toBe(1);
  });
  it('builds a file moved from the code into docs/', () => {
    const prev = git('rev-parse', 'HEAD');
    git('mv', 'apps/quiz/src/x.ts', 'docs/x.ts');
    expect(deploy(prev, commit({}))).toBe(1);
  });
  it('builds a deletion of code', () => {
    const prev = commit({ 'apps/quiz/src/z.ts': 'z' });
    expect(deploy(prev, commit({}, ['apps/quiz/src/z.ts']))).toBe(1);
  });
  it('builds the first deployment of a branch, a redeploy, an empty diff and an unknown previous commit', () => {
    const head = git('rev-parse', 'HEAD');
    expect(deploy('', head)).toBe(1);
    expect(deploy(head, head)).toBe(1);
    const prev = head;
    expect(deploy(prev, commit({}))).toBe(1);
    expect(deploy('0123456789abcdef0123456789abcdef01234567', head)).toBe(1);
  });
  it('holds the production of otakuquiz and fandomverse until launch, not their previews nor kpopquiz', () => {
    const prev = git('rev-parse', 'HEAD');
    const head = commit({ 'apps/quiz/src/w.ts': 'w' });
    expect(deploy(prev, head, { VERCEL_ENV: 'production', VERCEL_PROJECT_NAME: 'otakuquiz' })).toBe(0);
    expect(deploy(prev, head, { VERCEL_ENV: 'production', VERCEL_PROJECT_NAME: 'fandomverse' })).toBe(0);
    expect(deploy(prev, head, { VERCEL_ENV: 'preview', VERCEL_PROJECT_NAME: 'otakuquiz' })).toBe(1);
    expect(deploy(prev, head, { VERCEL_ENV: 'production', VERCEL_PROJECT_NAME: 'kpopquiz' })).toBe(1);
  });
});

describe('the Preview of main that the Microfrontends group creates', () => {
  const on = (project: string, env: string, ref: string, prev: string, head: string): Record<string, string> => ({
    VERCEL_ENV: env, VERCEL_PROJECT_NAME: project, VERCEL_GIT_COMMIT_REF: ref, VERCEL_GIT_PREVIOUS_SHA: prev, VERCEL_GIT_COMMIT_SHA: head,
  });
  /** The script as the launch-day PR leaves it (K5b): the hold is off. */
  const afterLaunch = (env: Record<string, string>): number => {
    const copy = path.join(repo, 'after-launch.sh');
    const text = readFileSync(SCRIPT, 'utf8');
    expect(text).toContain('NET_PRODUCTION_HOLD=1');
    writeFileSync(copy, text.replace('NET_PRODUCTION_HOLD=1', 'NET_PRODUCTION_HOLD=0'));
    return spawnSync('bash', [copy], { cwd: path.join(repo, 'apps/quiz'), env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', ...env } }).status ?? -1;
  };
  it('is skipped on otakuquiz and fandomverse, code change or not, first deployment or not', () => {
    const prev = git('rev-parse', 'HEAD');
    const head = commit({ 'apps/quiz/src/v.ts': 'v' });
    for (const project of ['otakuquiz', 'fandomverse']) {
      expect(run(on(project, 'preview', 'main', prev, head))).toBe(0);
      expect(run(on(project, 'preview', 'main', '', head))).toBe(0);
    }
  });
  it('leaves the test environment and the other preview branches building', () => {
    const prev = git('rev-parse', 'HEAD');
    const head = commit({ 'apps/quiz/src/u.ts': 'u' });
    for (const project of ['otakuquiz', 'fandomverse']) {
      expect(run(on(project, 'preview', 'o1/integration', prev, head))).toBe(1);
      expect(run(on(project, 'preview', 'preview/x', prev, head))).toBe(1);
    }
  });
  it('builds in doubt: another project, or no project name', () => {
    const prev = git('rev-parse', 'HEAD');
    const head = commit({ 'apps/quiz/src/s.ts': 's' });
    expect(run(on('kpopquiz', 'preview', 'main', prev, head))).toBe(1);
    expect(run({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_PREVIOUS_SHA: prev, VERCEL_GIT_COMMIT_SHA: head })).toBe(1);
  });
  it('changes no production build: kpopquiz builds today, and all three build once the hold is off', () => {
    const prev = git('rev-parse', 'HEAD');
    const head = commit({ 'apps/quiz/src/r.ts': 'r' });
    expect(run(on('kpopquiz', 'production', 'main', prev, head))).toBe(1);
    for (const project of ['kpopquiz', 'otakuquiz', 'fandomverse']) {
      expect(afterLaunch(on(project, 'production', 'main', prev, head))).toBe(1);
    }
  });
});
