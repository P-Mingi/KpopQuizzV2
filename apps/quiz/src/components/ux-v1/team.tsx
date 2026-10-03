import { TEAM_TAG, TEAM_TAG_TITLE, teamNote } from '@/lib/ux-v1/a0/team';

/**
 * v12 Team pill (SYSTEM.md 5.6): sits right after an editorial account's name,
 * everywhere the name shows (feed, post, profile, notifications, search).
 * `PersonName isTeam` renders it for you. Server-safe.
 */
export function TeamTag({ className }: { className?: string | undefined }): React.ReactElement {
  return <span className={['ux-teamtag', className ?? ''].filter(Boolean).join(' ')} title={TEAM_TAG_TITLE}>{TEAM_TAG}</span>;
}

/**
 * The line under an editorial account's name, on the post and on the profile:
 * "Editorial account of the KpopQuiz team. Topics and blogs are written by the
 * team and checked before they go live." (a post adds "Replies come from fans.").
 */
export function TeamNote({ surface = 'post', className }: { surface?: 'post' | 'profile' | undefined; className?: string | undefined }): React.ReactElement {
  return <p className={['ux-teamnote', className ?? ''].filter(Boolean).join(' ')}>{teamNote(surface)}</p>;
}
