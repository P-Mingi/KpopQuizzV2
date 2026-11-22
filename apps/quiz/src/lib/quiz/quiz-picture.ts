// Owner, 2026-11-22 ("on OtakuQuiz and kpopquiz the images are not showing anymore"): the pictures of a quiz page, its photocard and its
// related cards follow its quiz card (components/ux-v1/quiz-card.tsx, and the series art on OtakuQuiz): the quiz's own cover, else the photo
// of its group or series, else (General K-pop only) its fallback cover, else the typographic cover. Before, the page read the kpop group
// photos only, so a General K-pop quiz and every anime quiz without a cover of its own drew the typographic cover.
import { groupPhotoOf } from '@/lib/site/hub/home-photo';
import { generalKpopFallbackCover } from '@/lib/ux-v1/a0/general-kpop-cover';

export type QuizPictureSite = 'kpop' | 'anime';

/** The photo of the group (kpopquiz.org: groupPhotoUrl) or the series (OtakuQuiz: the owner's verified upload, else the bundled photo), or null. */
export function quizGroupPhoto(site: QuizPictureSite, groupSlug: string | null | undefined): string | null {
  return groupPhotoOf(site, groupSlug);
}

/** The last picture before the typographic cover: General K-pop's fallback cover on kpopquiz.org, else null. */
export function quizFallbackCover(site: QuizPictureSite, groupSlug: string | null | undefined): string | null {
  return site === 'kpop' ? generalKpopFallbackCover(groupSlug) : null;
}
