// The GitHub CLI in a workflow needs to know the repository. Inside a checkout it reads it from .git; a job without a checkout must name
// it (GH_REPO, or --repo / -R). IndexNow submit (.github/workflows/indexnow.yml) had no checkout and no GH_REPO from #220 on: every run on
// main stopped with "failed to determine base repo: failed to run git: fatal: not a git repository" (integrator, 2026-11-17). Read as
// text, every workflow file: each step that runs gh is in a job with a checkout, or names the repository.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const DIR = path.resolve(__dirname, '../../../../.github/workflows');
const FILES = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
const GH = /(^|[\s;(|&$`])gh\s+(run|api|pr|release|issue|workflow|cache|repo|secret|variable|label)\b/;

/** The jobs of a workflow file: name, the lines of the job. Jobs sit at two spaces under `jobs:`. */
function jobs(text: string): { name: string; lines: string[] }[] {
  const lines = text.split('\n').filter((l) => !/^\s*#/.test(l));
  const at = lines.findIndex((l) => l === 'jobs:');
  const out: { name: string; lines: string[] }[] = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) out.push({ name: m[1]!, lines: [] });
    else if (/^\S/.test(l)) break;
    else if (out.length) out[out.length - 1]!.lines.push(l);
  }
  return out;
}

/** The steps of a job: the lines from one `- ` at six spaces to the next. */
function steps(job: string[]): string[] {
  const out: string[] = [];
  for (const l of job) {
    if (/^ {6}- /.test(l)) out.push(l);
    else if (out.length && /^ {7,}\S|^\s*$/.test(l)) out[out.length - 1] += `\n${l}`;
  }
  return out;
}

describe('gh in the workflows knows its repository', () => {
  it('reads every workflow file', () => {
    expect(FILES).toContain('indexnow.yml');
    for (const f of FILES) expect(jobs(readFileSync(path.join(DIR, f), 'utf8')).length, f).toBeGreaterThan(0);
  });

  it('each step that runs gh is in a job with a checkout, or sets GH_REPO, or passes --repo', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      const text = readFileSync(path.join(DIR, f), 'utf8');
      const topEnv = /^env:\n(?: {2}.*\n)*? {2}GH_REPO:/m.test(text);
      for (const j of jobs(text)) {
        const checkout = j.lines.some((l) => /uses:\s*actions\/checkout@/.test(l));
        const jobEnv = j.lines.some((l) => /^ {4}env:/.test(l)) && j.lines.some((l) => /^ {6}GH_REPO:/.test(l));
        for (const s of steps(j.lines)) {
          if (!GH.test(s)) continue;
          if (checkout || topEnv || jobEnv || /^ {10}GH_REPO: \S/m.test(s) || /\s(--repo|-R)\s/.test(s)) continue;
          bad.push(`${f} job ${j.name}: ${s.split('\n')[0]!.trim()}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('IndexNow submit names the repository on its gh step', () => {
    const text = readFileSync(path.join(DIR, 'indexnow.yml'), 'utf8');
    const step = steps(jobs(text).find((j) => j.name === 'submit')!.lines).find((s) => s.includes('name: Fetch the sitemap of the last submission'))!;
    expect(step).toContain('GH_TOKEN: ${{ github.token }}');
    expect(step).toContain('GH_REPO: ${{ github.repository }}');
    expect(step).toContain('gh run list --workflow indexnow.yml --status success');
    expect(jobs(text).find((j) => j.name === 'submit')!.lines.some((l) => /actions\/checkout@/.test(l))).toBe(false);
  });
});
