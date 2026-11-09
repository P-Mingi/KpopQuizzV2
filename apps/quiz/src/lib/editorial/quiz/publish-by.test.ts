// Audit 04 P1-6: publish_by on a quiz draft (an award show's start). Stored in the payload, so no SQL file is needed. A draft past its
// publish_by expires (never published); the draft with the nearest deadline goes first; the schedule draws its slot before it.

import { describe, expect, it } from 'vitest';

import { checkQuizPayload, publishByMs } from './payload';
import { planQuizPublish, planQuizSchedule } from './rules';
import { ADMIN, DAY, GROUPS, JAE, MINA, MIN, NOW, draftFor, goodPayload, iso, isAdmin } from './test-fixtures';

import type { QuizPublishContext, QuizRuleDraft } from './rules';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe('publish_by in the payload', () => {
  it('a date or a UTC date-time is accepted and kept; nothing else', () => {
    expect(checkQuizPayload(goodPayload({ publish_by: '2026-11-14' })).ok).toBe(true);
    expect(checkQuizPayload(goodPayload({ publish_by: '2026-11-14T09:00:00Z' })).ok).toBe(true);
    for (const bad of ['tomorrow', '2026-02-30', '2026-11-14T09:00:00+09:00', '14/11/2026', '']) {
      const r = checkQuizPayload(goodPayload({ publish_by: bad }));
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.error).toBe('bad_publish_by');
    }
    const r = checkQuizPayload(goodPayload({ publish_by: '2026-11-14' }));
    expect(r.ok && r.value.publish_by).toBe('2026-11-14');
    const none = checkQuizPayload(goodPayload());
    expect(none.ok && 'publish_by' in none.value).toBe(false);
  });
  it('publishByMs: a date is the start of that UTC day', () => {
    expect(publishByMs('2026-11-14')).toBe(Date.parse('2026-11-14T00:00:00Z'));
    expect(publishByMs('2026-11-14T09:30:00Z')).toBe(Date.parse('2026-11-14T09:30:00Z'));
    expect(publishByMs(5)).toBeNull();
  });
});

describe('the publisher: expiry and deadline first', () => {
  const due = (id: number, group: number, over: Partial<QuizRuleDraft> = {}, publishBy?: string): QuizRuleDraft => ({
    id, account_id: MINA, group_id: group, status: 'approved', scheduled_at: iso(NOW - MIN * id), reviewed_by: ADMIN, reviewed_at: iso(NOW - 60 * MIN), published_ref: null,
    payload: { ...draftFor(GROUPS.find((g) => g.id === group)!, id), ...(publishBy ? { publish_by: publishBy } : {}) }, ...over,
  });
  const ctx = (over: Partial<QuizPublishContext> = {}): QuizPublishContext => ({
    now: NOW, publishedToday: [], isAdmin, activeAccountIds: new Set([MINA, JAE]), slugOwners: new Map(), groupSlugs: new Set(GROUPS.map((g) => g.slug)),
    groupSlugById: new Map(GROUPS.map((g) => [g.id, g.slug] as const)), ...over,
  });

  it('past its publish_by a draft expires: it is skipped, never picked', () => {
    const plan = planQuizPublish([due(1, 1, {}, '2026-11-04')], ctx());   // NOW is 2026-11-04T09:00Z, the day started 9 hours ago
    expect(plan).toMatchObject({ pick: null, reason: 'nothing_due' });
    expect(plan.skipped).toEqual([{ id: 1, reason: 'expired' }]);
  });
  it('before its publish_by it is published', () => {
    expect(planQuizPublish([due(1, 1, {}, '2026-11-14')], ctx()).pick?.id).toBe(1);
  });
  it('the nearest deadline goes first, ahead of an older scheduled draft with none', () => {
    const plan = planQuizPublish([due(1, 1), due(2, 2, {}, '2026-11-20'), due(3, 3, {}, '2026-11-14')], ctx());
    expect(plan.pick?.id).toBe(3);
    expect(planQuizPublish([due(1, 1), due(2, 2, {}, '2026-11-20')], ctx()).pick?.id).toBe(2);
    expect(planQuizPublish([due(1, 1), due(2, 2)], ctx()).pick?.id).toBe(2); // unchanged without deadlines: the older schedule first
  });
});

describe('the scheduler: deadline first, slot before the deadline', () => {
  const none = new Set<number>();
  it('a draft with a deadline in 2 days is scheduled before it, whatever the random draw', () => {
    const deadline = NOW + 2 * DAY;
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planQuizSchedule(
        [{ id: 1, group_id: 1 }, { id: 2, group_id: 2, publish_by: deadline }, { id: 3, group_id: 3 }],
        { now: NOW, days: 7, existing: [], firstGroups: none, rand: seeded(seed) },
      );
      const at = plan.assigned.find((a) => a.id === 2)!;
      expect(Date.parse(at.scheduled_at), `seed ${seed}`).toBeLessThan(deadline);
      expect(plan.unplaced).toEqual([]);
    }
  });
  it('a deadline already passed (or with no slot left before it) is unplaced as past_deadline, the others are placed', () => {
    const plan = planQuizSchedule(
      [{ id: 1, group_id: 1, publish_by: NOW - DAY }, { id: 2, group_id: 2 }],
      { now: NOW, days: 7, existing: [], firstGroups: none, rand: seeded(1) },
    );
    expect(plan.unplaced).toEqual([{ id: 1, reason: 'past_deadline' }]);
    expect(plan.assigned.map((a) => a.id)).toEqual([2]);
  });
  it('without deadlines the plan is the one of before (same seed, same result)', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, group_id: i + 1 }));
    const a = planQuizSchedule(items, { now: NOW, days: 5, existing: [], firstGroups: none, rand: seeded(7) });
    const b = planQuizSchedule(items.map((x) => ({ ...x, publish_by: null })), { now: NOW, days: 5, existing: [], firstGroups: none, rand: seeded(7) });
    expect(b).toEqual(a);
  });
});
