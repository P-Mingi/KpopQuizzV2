import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { leavableSites as fromAccount } from './account';
import { DELETION_GRACE_DAYS, HANDOFF_LOG_DAYS, KEEP_QUIZZES_DEFAULT, leavableSites } from './policy';

// Lot (d), H1 point 12: the words of the privacy policy about deletion are pinned to the code. The constants of policy.ts are what the page
// prints; the SQL is what the database does. If either moves, this file fails until the policy text is looked at again.

const ROOT = join(__dirname, '../../../../../..');
const sql = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');
const DELETION = sql('docs/pending-migrations/multisite/016-passport-deletion.sql');
const HANDOFF = sql('docs/pending-migrations/multisite/006-passport-handoff.sql');
const CONTRACT = sql('docs/o1/contracts/schema.sql');

describe('the numbers the policy publishes', () => {
  it('the grace period is the one of passport_request_deletion', () => {
    const hit = /v_run_after\s+timestamptz\s*:=\s*now\(\)\s*\+\s*interval\s*'(\d+) days'/.exec(DELETION);
    expect(hit, 'run_after in 016').not.toBeNull();
    expect(Number(hit![1])).toBe(DELETION_GRACE_DAYS);
    expect(DELETION_GRACE_DAYS).toBe(7);
  });

  it('the quizzes of a deleted member are kept unless asked: the default of the SQL and of the contract is true', () => {
    expect(KEEP_QUIZZES_DEFAULT).toBe(true);
    expect(DELETION).toMatch(/keep_quizzes boolean not null default true/);
    expect(DELETION).toMatch(/passport_request_deletion\(p_user uuid, p_from_site text, p_keep_quizzes boolean default true\)/);
    expect(DELETION).toMatch(/coalesce\(p_keep_quizzes, true\)/);
    expect(CONTRACT).toMatch(/keep_quizzes boolean not null default true/);
    expect(CONTRACT).toMatch(/passport_request_deletion\(p_user uuid, p_from_site text, p_keep_quizzes boolean default true\)/);
  });

  it('the hand-off log is deleted after the days of passport_cleanup', () => {
    const hit = /delete from passport\.handoff_events e where e\.at < now\(\) - interval '(\d+) days'/.exec(HANDOFF);
    expect(hit, 'cleanup in 006').not.toBeNull();
    expect(Number(hit![1])).toBe(HANDOFF_LOG_DAYS);
    expect(HANDOFF_LOG_DAYS).toBe(90);
  });

  it('the sites a member can leave: the one list, kpop never in it', () => {
    expect(fromAccount).toBe(leavableSites);
    expect(leavableSites()).toEqual(['anime']);
  });
});
