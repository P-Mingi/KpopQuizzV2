// Editorial accounts (SYSTEM.md 5.6): the words every surface shows for them.
// One place, so the feed, the post, the profile, notifications and search say
// the same thing.

/** The pill after the name. */
export const TEAM_TAG = 'Team';
/** Tooltip of the pill. */
export const TEAM_TAG_TITLE = 'Editorial account run by the KpopQuiz team';
/** The line under the name (SYSTEM.md 5.6, verbatim). */
export const TEAM_NOTE = 'Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live.';

/** The line for a surface: a post adds who replies (prototype `openPost('team')`). */
export function teamNote(surface: 'post' | 'profile'): string {
  return surface === 'post' ? `${TEAM_NOTE} Replies come from fans.` : TEAM_NOTE;
}
