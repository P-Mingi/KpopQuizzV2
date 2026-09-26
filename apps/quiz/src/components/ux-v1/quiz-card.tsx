import Link from 'next/link';
import Image from 'next/image';

import { formatCount } from '@/lib/utils';
import { isConfiguredImageHost } from '@/lib/image-hosts';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { QUIZ_TYPE_GLYPH, TYPE_GLYPHS } from '@/lib/ux-v1/a0/type-glyphs';

/** The type glyph of the typographic cover (own tiny map: this card is imported by
 *  legacy client lists, so it must not pull the whole icon set flag-off). */
function TypeGlyph({ quizType }: { quizType: string }): React.ReactElement {
  const [viewBox, inner] = TYPE_GLYPHS[QUIZ_TYPE_GLYPH[quizType] ?? 't-classic'];
  return <svg className="ux-ico" viewBox={viewBox} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: inner }} />;
}

import type { QuizCardData } from '@/lib/db/types';

// Below this many plays the footer says "New" instead of a low count. DISPLAY
// ONLY, the same rule as the legacy card (components/ui/quiz-card.tsx): the real
// play_count is never changed.
const NEW_QUIZ_PLAY_THRESHOLD = 7;

const LEVEL: Record<string, { n: 1 | 2 | 3; label: string }> = {
  easy: { n: 1, label: 'Easy' },
  medium: { n: 2, label: 'Medium' },
  hard: { n: 3, label: 'Hard' },
};

/** Difficulty bars (17.11): 3 bars 3px wide, 5/8/11 px tall, pink up to the level. */
export function LevelBars({ level }: { level: 1 | 2 | 3 }): React.ReactElement {
  return <span className="ux-lvb" data-l={level} aria-hidden="true"><i /><i /><i /></span>;
}

/** Level word + bars, for any quiz row ("Easy", "Medium", "Hard"). */
export function levelOf(difficulty: string | null | undefined): { n: 1 | 2 | 3; label: string } {
  return LEVEL[(difficulty ?? '').toLowerCase()] ?? { n: 2, label: 'Medium' };
}

export type UxQuizCardData = Pick<QuizCardData,
  'slug' | 'title' | 'group_name' | 'group_slug' | 'quiz_type' | 'difficulty' | 'play_count' | 'cover_image_url'>;

interface UxQuizCardProps {
  quiz: UxQuizCardData;
  /** Heading level of the title (h3 in section grids, as the prototype). */
  titleAs?: 'h2' | 'h3' | 'p' | undefined;
  /** First row above the fold: eager-load the photo. */
  priority?: boolean | undefined;
  /** next/image sizes; the default matches the 4 / 3 / 72vw grid. */
  sizes?: string | undefined;
  className?: string | undefined;
  /** Preview mode (create step 3, "How it will look"): the same card without the link,
   *  for a draft that has no /q/<slug> yet. Its cover may be a data: or blob: URL (a
   *  plain <img>; next/image and the host list refuse them). The card is one image
   *  for assistive tech, named by `previewLabel` (default "Preview: title, group, level"). */
  preview?: boolean | undefined;
  previewLabel?: string | undefined;
}

const DEFAULT_SIZES = '(max-width: 760px) 72vw, (max-width: 1100px) 33vw, 262px';

/**
 * UX v11.2 quiz card (DESIGN-SPEC 17.11). Bordered (--line), radius 18, the photo
 * FLUSH with the card (4:3, no radius of its own), then the group eyebrow (pink
 * ink), the title (2 lines max) and the footer: difficulty bars + level on the
 * left, plays (or "New") on the right. A real crawlable <a href="/q/{slug}">.
 * Cover rule: the quiz's own cover_image_url, else the group photo from
 * public/idols, else the typographic cover (type glyph + group name). Server
 * component; in a stacked phone list use <UxQuizGrid stack>.
 */
export function UxQuizCard({ quiz, titleAs: T = 'h3', priority, sizes = DEFAULT_SIZES, className, preview, previewLabel }: UxQuizCardProps): React.ReactElement {
  const local = preview && quiz.cover_image_url && /^(data:image\/|blob:)/.test(quiz.cover_image_url) ? quiz.cover_image_url : null;
  const own = !local && quiz.cover_image_url && isConfiguredImageHost(quiz.cover_image_url) ? quiz.cover_image_url : null;
  const photo = own ?? (local ? null : groupPhotoUrl(quiz.group_slug));
  const level = levelOf(quiz.difficulty);
  const plays = quiz.play_count < NEW_QUIZ_PLAY_THRESHOLD ? 'New' : `${formatCount(quiz.play_count)} plays`;

  const body = (
    <>
      <div className="ux-qcov">
        {local ? (
          // eslint-disable-next-line @next/next/no-img-element -- a draft's data: / blob: cover (preview only)
          <img src={local} alt="" className="ux-qcov-img" style={{ objectPosition: 'center 25%' }} />
        ) : photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes={sizes}
            priority={priority === true}
            className="ux-qcov-img"
            style={{ objectPosition: own ? 'center 25%' : photoFocal(quiz.title) }}
          />
        ) : (
          <div className="ux-qcov-fb">
            <span className="ux-fbn"><TypeGlyph quizType={quiz.quiz_type} />{quiz.group_name}</span>
          </div>
        )}
      </div>
      <div className="ux-qb">
        <span className="ux-qg">{quiz.group_name}</span>
        <T className="ux-qt">{quiz.title}</T>
        <div className="ux-qf">
          <span className="ux-qlv"><LevelBars level={level.n} />{level.label}</span>
          <span className="ux-qpl">{plays}</span>
        </div>
      </div>
    </>
  );
  const cls = ['ux-qcard', preview ? 'is-preview' : '', className ?? ''].filter(Boolean).join(' ');
  if (preview) {
    return <div className={cls} role="img" aria-label={previewLabel ?? `Preview: ${quiz.title}, ${quiz.group_name}, ${level.label}`}>{body}</div>;
  }
  return <Link href={`/q/${quiz.slug}`} className={cls}>{body}</Link>;
}

/** Card grid: 4 columns (3 under 1100), a snap scroller on phones, or with
 *  `stack` a list of bordered rows with a 96px square thumb (17.11 mobile). */
export function UxQuizGrid({ children, stack, columns = 4, className }: {
  children: React.ReactNode; stack?: boolean; columns?: 3 | 4; className?: string;
}): React.ReactElement {
  const cls = ['ux-qgrid', stack ? 'ux-qgrid-stack' : '', columns === 3 ? 'ux-qgrid-3' : '', className ?? ''].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
