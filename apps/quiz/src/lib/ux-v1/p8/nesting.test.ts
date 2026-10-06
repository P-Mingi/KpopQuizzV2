import { describe, expect, it } from 'vitest';

import { canNestUnder, countVisible, dailyKey, levelOf, MAX_REPLY_DEPTH, nest, SHOWN_DEPTH } from './nesting';
import { checkReply } from './validate';

// Replies like on Reddit (owner, 2026-10-06): levels, the 10-level cap, the tree with its
// "[removed]" places, and the reply payloads (daily debate, vote comment parent).

/** A chain of `n` rows: r1 (top), r2 under r1, ... */
function chain(n: number): Map<string, string | null> {
  const m = new Map<string, string | null>();
  for (let i = 1; i <= n; i++) m.set(`r${i}`, i === 1 ? null : `r${i - 1}`);
  return m;
}

describe('levels and the 10-level cap', () => {
  it('a comment on the post is level 1, its reply 2, and so on', () => {
    const m = chain(4);
    expect(levelOf('r1', m)).toBe(1);
    expect(levelOf('r3', m)).toBe(3);
    expect(levelOf('r4', m)).toBe(4);
  });
  it("a thread's opening post is level 0: a reply to it is a comment (level 1)", () => {
    const m = chain(3);
    expect(levelOf('r2', m, (id) => (id === 'r1' ? 0 : 1))).toBe(1);
    expect(levelOf('r3', m, (id) => (id === 'r1' ? 0 : 1))).toBe(2);
  });
  it('a reply goes under level 9 (it becomes 10), never under level 10', () => {
    const m = chain(10);
    expect(MAX_REPLY_DEPTH).toBe(10);
    expect(canNestUnder(levelOf('r9', m))).toBe(true);
    expect(canNestUnder(levelOf('r10', m))).toBe(false);
  });
  it('unknown rows, parents outside the post and loops are refused', () => {
    expect(levelOf('nope', chain(2))).toBeNull();
    expect(levelOf('a', new Map([['a', 'elsewhere']]))).toBeNull();
    expect(levelOf('a', new Map<string, string | null>([['a', 'b'], ['b', 'a']]))).toBeNull();
    expect(canNestUnder(null)).toBe(false);
  });
  it('the view shows 6 levels before "Continue this thread"', () => { expect(SHOWN_DEPTH).toBe(6); });
});

interface N { id: string; depth: number; removed?: true; replies: N[] }
const row = (id: string, parent: string | null, visible = true): { id: string; parent: string | null; visible: boolean } => ({ id, parent, visible });
const make = (r: { id: string; visible: boolean }, depth: number, replies: N[]): N => ({ id: r.id, depth, replies, ...(r.visible ? {} : { removed: true as const }) });

describe('the tree', () => {
  it('nests every level, oldest first, with the depth of each node', () => {
    const t = nest([row('a', null), row('b', 'a'), row('c', 'b'), row('d', null), row('e', 'a')], make);
    expect(t.map((x) => x.id)).toEqual(['a', 'd']);
    expect(t[0]!.replies.map((x) => x.id)).toEqual(['b', 'e']);
    expect(t[0]!.replies[0]!.replies[0]).toMatchObject({ id: 'c', depth: 3 });
    expect(countVisible(t)).toBe(5);
  });
  it('a hidden reply with visible replies keeps its place as [removed]; its replies stay', () => {
    const t = nest([row('a', null), row('b', 'a', false), row('c', 'b'), row('d', 'c')], make);
    expect(t[0]!.replies[0]).toMatchObject({ id: 'b', removed: true, depth: 2 });
    expect(t[0]!.replies[0]!.replies[0]!.replies[0]).toMatchObject({ id: 'd', depth: 4 });
    expect(countVisible(t)).toBe(3); // [removed] does not count
  });
  it('a hidden reply with nothing visible under it disappears with its branch', () => {
    const t = nest([row('a', null), row('b', 'a', false), row('c', 'b', false), row('d', null, false)], make);
    expect(t).toEqual([{ id: 'a', depth: 1, replies: [] }]);
  });
  it('a row whose parent is not in the post sits at the top; a loop is dropped', () => {
    const t = nest([row('x', 'gone'), row('p', 'q'), row('q', 'p')], make);
    expect(t.map((x) => x.id)).toEqual(['x']);
  });
});

describe('reply payloads', () => {
  it('the daily debate: target_id is its day, open or closed (stored as YYYYMMDD)', () => {
    expect(checkReply({ target_type: 'daily_debate', target_id: '2026-10-05', body: 'hi' })).toMatchObject({ ok: true, value: { type: 'daily_debate', targetId: 20261005, date: '2026-10-05', parentId: null, parentVote: null } });
    expect(checkReply({ target_type: 'daily_debate', target_id: 20261005, body: 'hi' }).ok).toBe(false);
    expect(dailyKey('2026-10-05')).toBe(20261005);
    expect(dailyKey('yesterday')).toBeNull();
  });
  it('a reply to a vote comment (parent_vote, daily debate only) or to a reply (parent_id), never both', () => {
    const vote = 'a1b2c3d4-0000-4000-8000-00000000abcd';
    expect(checkReply({ target_type: 'daily_debate', target_id: '2026-10-05', body: 'hi', parent_vote: vote })).toMatchObject({ ok: true, value: { parentVote: vote } });
    expect(checkReply({ target_type: 'debate', target_id: 4, body: 'hi', parent_vote: vote }).ok).toBe(false);
    expect(checkReply({ target_type: 'daily_debate', target_id: '2026-10-05', body: 'hi', parent_vote: vote, parent_id: 3 }).ok).toBe(false);
    expect(checkReply({ target_type: 'daily_debate', target_id: '2026-10-05', body: 'hi', parent_vote: 'nope' }).ok).toBe(false);
    expect(checkReply({ target_type: 'challenge', target_id: 4, body: 'hi', parent_id: 9 })).toMatchObject({ ok: true, value: { parentId: 9 } });
  });
});
