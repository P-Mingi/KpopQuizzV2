// Replies like on Reddit (owner, 2026-10-06): any comment or reply takes a reply, at
// every level, 10 levels at most (level 1 = a comment on the post). The post view shows
// 6 levels, then "Continue this thread" opens the rest. A reply hidden by its reports (or
// deleted) keeps the place of the replies under it as "[removed]".
// Pure: shared by the routes (the depth check), the post loader (the tree) and the view.

export const MAX_REPLY_DEPTH = 10;
/** Levels shown before "Continue this thread". */
export const SHOWN_DEPTH = 6;

/**
 * Level of a row: 1 + the number of rows above it, plus the level of its top row minus 1
 * (`topLevel`: 1 for a comment on the post, 0 for a thread's opening post). `parentOf`
 * maps every row of the post to its parent (null = a top row). Null = unknown row, a
 * parent outside the post, or a loop.
 */
export function levelOf(id: string, parentOf: ReadonlyMap<string, string | null>, topLevel: (id: string) => number = () => 1): number | null {
  const seen = new Set<string>();
  let cur = id;
  let above = 0;
  for (;;) {
    if (!parentOf.has(cur) || seen.has(cur) || above > MAX_REPLY_DEPTH + 2) return null;
    seen.add(cur);
    const p = parentOf.get(cur) ?? null;
    if (p === null) return topLevel(cur) + above;
    cur = p;
    above++;
  }
}

/** May a reply go under this parent? Its level must be known and below the maximum. */
export function canNestUnder(parentLevel: number | null): boolean {
  return parentLevel !== null && parentLevel + 1 <= MAX_REPLY_DEPTH;
}

export interface TreeRow { id: string; parent: string | null; visible: boolean }

/**
 * Rows (oldest first) as a tree. A row whose parent is not among the rows sits at the
 * top. A row that is not visible stays only when a visible reply sits under it (its place
 * then shows "[removed]"); otherwise it is dropped with its empty branch. `make` builds a
 * node from a row, its level and its kept replies.
 */
export function nest<R extends TreeRow, C>(rows: readonly R[], make: (row: R, depth: number, replies: C[]) => C): C[] {
  const ids = new Set(rows.map((r) => r.id));
  const kids = new Map<string, R[]>();
  const top: R[] = [];
  for (const r of rows) {
    if (r.parent !== null && r.parent !== r.id && ids.has(r.parent)) {
      const list = kids.get(r.parent) ?? [];
      list.push(r);
      kids.set(r.parent, list);
    } else {
      top.push(r);
    }
  }
  const seen = new Set<string>();
  const walk = (r: R, depth: number): C | null => {
    if (seen.has(r.id)) return null;
    seen.add(r.id);
    const replies = (kids.get(r.id) ?? []).map((k) => walk(k, depth + 1)).filter((c): c is C => c !== null);
    if (!r.visible && !replies.length) return null;
    return make(r, depth, replies);
  };
  return top.map((r) => walk(r, 1)).filter((c): c is C => c !== null);
}

/** Visible comments at every level (a "[removed]" place does not count). */
export function countVisible<C extends { removed?: true; replies: C[] }>(list: readonly C[]): number {
  return list.reduce((s, c) => s + (c.removed ? 0 : 1) + countVisible(c.replies), 0);
}

/** The daily debate's key in community_replies.target_id: its day as YYYYMMDD. */
export function dailyKey(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return Number(date.replace(/-/g, ''));
}
