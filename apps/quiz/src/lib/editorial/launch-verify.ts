// Test helper: the "-- Verify: <query>;   expect <value>" lines of a launch SQL header, parsed out of the file itself, run on PGlite.
// The header cannot drift from the file: after an apply (or a rollback) every line of that file's header holds.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MIGRATIONS } from '@/lib/dle/pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

export const readLaunchFile = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');

export interface VerifyLine { query: string; expect: string }

export function verifyLines(file: string): VerifyLine[] {
  const out: VerifyLine[] = [];
  for (const line of readLaunchFile(file).split('\n')) {
    if (!line.startsWith('-- Verify:')) continue;
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    if (!m) throw new Error(`${file}: unreadable Verify line: ${line}`);
    out.push({ query: m[1]!, expect: m[2]! });
  }
  return out;
}

/** Runs every Verify line of `file` and returns [query, got, expected] for those that differ (empty = all hold). */
export async function verifyDiffs(db: PGlite, file: string): Promise<Array<[string, string, string]>> {
  const diffs: Array<[string, string, string]> = [];
  for (const v of verifyLines(file)) {
    const r = await db.query<Record<string, unknown>>(v.query.replace(/;$/, ''));
    const cell = r.rows.length === 1 ? Object.values(r.rows[0]!)[0] : `rows:${r.rows.length}`;
    const got = cell === null ? 'NULL' : String(cell);
    if (got !== v.expect) diffs.push([v.query, got, v.expect]);
  }
  return diffs;
}
