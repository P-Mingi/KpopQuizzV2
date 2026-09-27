// Avatar menu "My quizzes" (prototype #avapop: `go('you');ptab('quizzes')` with
// `<small>1 draft</small>`). The link opens the personal passport's Quizzes tab:
// P10's PassportTabs opens a tab from a `#p10-panel-<id>` hash on load and on
// `hashchange`. /me directly (not /profile): /profile is a server redirect to /me,
// and a soft navigation through that redirect would drop the hash.
//
// The draft count reads the one draft that exists: the create funnel's
// device-local draft (lib/create-draft.ts, localStorage). No server read: quizzes
// are never saved as server drafts (`quizzes.status = 'draft'` exists in the
// schema, /api/quiz/create does not write it), and /api/auth/me carries no count.

import { loadDraft } from '@/lib/create-draft';
import { questionHasContent } from '@/lib/ux-v1/p5/funnel';

import type { Draft } from '@/lib/create-draft';

export const MY_QUIZZES_HREF = '/me#p10-panel-quizzes';

/**
 * The hash to switch to in place when `href` points at the page already shown
 * (`pathname`), else null. A soft navigation to the same path with only a new hash
 * fires no `hashchange` (the router uses pushState), so the caller replaces the
 * hash and dispatches the event itself.
 */
export function samePageHash(href: string, pathname: string): string | null {
  const i = href.indexOf('#');
  if (i < 0) return null;
  const path = href.slice(0, i) || pathname;
  return path === pathname ? href.slice(i) : null;
}

const filled = (s: string | null | undefined): boolean => typeof s === 'string' && s.trim() !== '';

/**
 * A draft the creator started: something typed or picked by hand (title, a new
 * group name, the cover, the note, or a question the funnel itself counts as
 * started: P5's `questionHasContent`). The funnel autosaves a blank draft on every
 * /create visit, and a `?group=` deep link presets the group, so neither counts.
 */
export function isStartedDraft(d: Pick<Draft, 'title' | 'newGroup' | 'cover' | 'creatorNote' | 'questions'> | null): boolean {
  if (!d) return false;
  if (filled(d.title) || filled(d.newGroup) || filled(d.cover) || filled(d.creatorNote)) return true;
  return Array.isArray(d.questions) && d.questions.some(questionHasContent);
}

/** Drafts on this device (0 or 1: the funnel keeps one). Browser only. The read is
 *  the funnel's own (7-day expiry, old formats migrated). */
export function localDraftCount(): number {
  return isStartedDraft(loadDraft()) ? 1 : 0;
}
