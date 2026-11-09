// The 9 Team (editorial) accounts used handles that read like fans ("njeansstan"), which shows in search results and links where no Team
// badge can show (audit 04 P0-2, owner decision 2026-11-09: new handles approved). This is the one map, old to new. The SQL file
// L31-l1-team-handles.sql renames the profiles with the same pairs (a test proves both lists equal). The old /u/<handle> URLs answer a
// permanent redirect to the new one, ONLY when no profile holds the old handle: so the redirect is live before the SQL (nothing is
// redirected, the old pages still exist) and after it (the old URL leads to the new one). Leaf module, no import.

export const TEAM_HANDLE_RENAMES: ReadonlyArray<readonly [old: string, next: string]> = [
  ['soojinnie', 'kpq_girlgroups'],
  ['joonified', 'kpq_bts'],
  ['pinkvelvet', 'kpq_pink_rv'],
  ['caratland', 'kpq_seventeen'],
  ['skzrealm', 'kpq_straykids_ateez'],
  ['njeansstan', 'kpq_4thgen'],
  ['kpophistory', 'kpq_history'],
  ['twiceland', 'kpq_twice_itzy'],
  ['exoplanet99', 'kpq_exo_shinee'],
];

const BY_OLD: ReadonlyMap<string, string> = new Map(TEAM_HANDLE_RENAMES);

/** The new handle of a renamed Team account, or null when `username` is not one of the 9 old handles. */
export function renamedTeamHandle(username: string): string | null {
  return BY_OLD.get(username.toLowerCase()) ?? null;
}

/** The handle the award engine files its drafts under (the old `kpophistory`). */
export const AWARD_TEAM_HANDLE = BY_OLD.get('kpophistory')!;
