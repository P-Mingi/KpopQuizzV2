// V12 F5c: the legacy Blindtest of the Day board (/blindtest/leaderboard) leaves
// editorial accounts out (SYSTEM.md 5.6, owner decision 2026-10-03). The RPC
// get_daily_bt_leaderboard is unchanged: the page drops the team rows it returns
// and closes the gaps they leave in the rank column. Display only: no stored
// score, rank or counter is touched.

export interface RankedRow {
  rank: number;
  user_id: string;
}

/**
 * The rows without the editorial accounts, ranks closed up. A row's new rank is
 * its old rank minus the team rows ranked strictly above it, so a tie the RPC
 * gave (two rows on rank 3) stays a tie and every gap a team row left is closed.
 * `team` null or empty (flag off, SQL pending, nobody active): the same array,
 * untouched.
 */
export function boardWithoutTeam<T extends RankedRow>(rows: T[], team: ReadonlySet<string> | null): T[] {
  if (!team || team.size === 0) return rows;
  const teamRanks = rows.filter((r) => team.has(r.user_id)).map((r) => r.rank);
  if (teamRanks.length === 0) return rows;
  return rows
    .filter((r) => !team.has(r.user_id))
    .map((r) => ({ ...r, rank: r.rank - teamRanks.filter((t) => t < r.rank).length }));
}
