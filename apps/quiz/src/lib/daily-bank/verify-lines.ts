// Test support (owner, 2026-11-09): the "-- Verify: <query>;   expect <value>" lines of a SQL file header, run on PGlite, so the header
// the owner reads cannot drift from the file.
import { expect } from 'vitest';

import { rows } from '../dle/pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

export interface Verify { query: string; expect: string }

export function verifyOf(sql: string, label: string): Verify[] {
  const out: Verify[] = [];
  for (const line of sql.split('\n')) {
    if (!line.startsWith('-- Verify:')) continue;
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    if (!m) throw new Error(`${label}: unreadable Verify line: ${line}`);
    out.push({ query: m[1]!, expect: m[2]! });
  }
  return out;
}

export async function checkVerify(db: PGlite, sql: string, label: string, min = 2): Promise<void> {
  const list = verifyOf(sql, label);
  expect(list.length, `${label}: Verify lines`).toBeGreaterThanOrEqual(min);
  for (const v of list) {
    const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
    expect(r.length, v.query).toBe(1);
    const cell = Object.values(r[0]!)[0];
    expect(cell === null ? 'NULL' : String(cell), v.query).toBe(v.expect);
  }
}
