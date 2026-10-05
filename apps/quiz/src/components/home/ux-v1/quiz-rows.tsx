import { UxRow } from '@/components/ux-v1/panel';
import { levelOf } from '@/components/ux-v1/quiz-card';
import { isConfiguredImageHost } from '@/lib/image-hosts';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { QUIZ_TYPE_ICON, QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';
import { ageLabel, comma } from '@/lib/ux-v1/p1/format';

import { NewThumb } from './new-thumb';

import type { QuizCardData } from '@/lib/db/types';

import type { ThumbCandidate } from './new-thumb';

/** All time best (16.7): numbered, no thumbnails; top 3 numbers pink-ink (17.1).
 *  Real play_count order; each row is a real /q/{slug} link. */
export function BestRows({ quizzes }: { quizzes: QuizCardData[] }): React.ReactElement {
  return (
    <div className="ux-rows">
      {quizzes.map((q, i) => (
        <UxRow
          key={q.id}
          href={`/q/${q.slug}`}
          lead={<span className={`ux-rn${i < 3 ? ' is-top' : ''}`} aria-hidden="true">{i + 1}</span>}
          title={q.title}
          sub={<span className="ux-num">{q.group_name} · {comma(q.play_count)} {q.play_count === 1 ? 'play' : 'plays'}</span>}
        />
      ))}
    </div>
  );
}

/** New quiz thumb: the quiz card's cover rule (the quiz's own cover, else the group
 *  photo), then the group logo, over the type glyph, which shows alone when none
 *  exists or every picture fails (new-thumb.tsx). Owner requests 2026-10-03 (the
 *  picture instead of the glyph of 16.7) and 2026-10-04 (bigger, never grey). */
function newThumbCandidates(q: QuizCardData): ThumbCandidate[] {
  const own = q.cover_image_url && isConfiguredImageHost(q.cover_image_url) ? q.cover_image_url : null;
  const logo = q.logo_url && isConfiguredImageHost(q.logo_url) ? q.logo_url : null;
  const group = groupPhotoUrl(q.group_slug);
  const out: ThumbCandidate[] = [];
  if (own) out.push({ src: own, position: 'center 25%' });
  if (group) out.push({ src: group, position: photoFocal(q.title) });
  if (logo) out.push({ src: logo, position: 'center' });
  return out.filter((c, i) => out.findIndex((o) => o.src === c.src) === i);
}

/** New quizzes (16.7): the quiz picture, group, type and level, age. */
export function NewRows({ quizzes, now }: { quizzes: QuizCardData[]; now: Date }): React.ReactElement {
  return (
    <div className="ux-rows">
      {quizzes.map((q) => (
        <UxRow
          key={q.id}
          href={`/q/${q.slug}`}
          lead={<NewThumb candidates={newThumbCandidates(q)} icon={QUIZ_TYPE_ICON[q.quiz_type] ?? 't-classic'} />}
          title={q.title}
          sub={`${q.group_name} · ${QUIZ_TYPE_LABEL[q.quiz_type] ?? 'Classic'} · ${levelOf(q.difficulty).label}`}
          end={<span className="ux-num">{ageLabel(q.created_at, now)}</span>}
        />
      ))}
    </div>
  );
}
