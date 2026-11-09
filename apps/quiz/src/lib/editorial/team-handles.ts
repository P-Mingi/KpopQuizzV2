// The 9 Team (editorial) accounts used handles that read like fans ("njeansstan"), which shows in search results and links where no Team
// badge can show (audit 04 P0-2, owner decision 2026-11-09: new handles approved). This is the one map, old to new. The SQL file
// L27-l1-team-handles.sql renames the profiles with the same pairs (a test proves both lists equal). The old /u/<handle> URLs answer a
// permanent redirect to the new one, ONLY when no profile holds the old handle: so the redirect is live before the SQL (nothing is
// redirected, the old pages still exist) and after it (the old URL leads to the new one). Leaf module, no import.

export const TEAM_HANDLE_RENAMES: ReadonlyArray<readonly [old: string, next: string]> = [
  ['soojinnie', 'kq_girlgroups'],
  ['joonified', 'kq_bts'],
  ['pinkvelvet', 'kq_blackpink_rv'],
  ['caratland', 'kq_seventeen'],
  ['skzrealm', 'kq_skz_ateez'],
  ['njeansstan', 'kq_nj_ive_lsf'],
  ['kpophistory', 'kq_history'],
  ['twiceland', 'kq_twice_itzy'],
  ['exoplanet99', 'kq_exo_shinee'],
];

const BY_OLD: ReadonlyMap<string, string> = new Map(TEAM_HANDLE_RENAMES);

/** The new handle of a renamed Team account, or null when `username` is not one of the 9 old handles. */
export function renamedTeamHandle(username: string): string | null {
  return BY_OLD.get(username.toLowerCase()) ?? null;
}

/** The handle the award engine files its drafts under (the old `kpophistory`). */
export const AWARD_TEAM_HANDLE = BY_OLD.get('kpophistory')!;
