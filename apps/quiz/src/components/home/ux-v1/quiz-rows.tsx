import Image from 'next/image';

import { Icon } from '@/components/ux-v1/icon';
import { UxRow } from '@/components/ux-v1/panel';
import { levelOf } from '@/components/ux-v1/quiz-card';
import { isConfiguredImageHost } from '@/lib/image-hosts';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { QUIZ_TYPE_ICON, QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';
import { ageLabel, comma } from '@/lib/ux-v1/p1/format';

import type { QuizCardData } from '@/lib/db/types';

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
 *  photo), then the group logo, and the type glyph only when none exists. Owner
 *  request 2026-10-03: the picture instead of the glyph of 16.7. */
function NewThumb({ q }: { q: QuizCardData }): React.ReactElement {
  const own = q.cover_image_url && isConfiguredImageHost(q.cover_image_url) ? q.cover_image_url : null;
  const logo = q.logo_url && isConfiguredImageHost(q.logo_url) ? q.logo_url : null;
  const photo = own ?? groupPhotoUrl(q.group_slug) ?? logo;
  if (!photo) {
    return <span className="ux-thumb is-glyph p1-glyph" aria-hidden="true"><Icon name={QUIZ_TYPE_ICON[q.quiz_type] ?? 't-classic'} /></span>;
  }
  return (
    <span className="ux-thumb p1-glyph p1-thumb" aria-hidden="true">
      <Image src={photo} alt="" fill sizes="40px" style={{ objectPosition: own ? 'center 25%' : photoFocal(q.title) }} />
    </span>
  );
}

/** New quizzes (16.7): the quiz picture, group, type and level, age. */
export function NewRows({ quizzes, now }: { quizzes: QuizCardData[]; now: Date }): React.ReactElement {
  return (
    <div className="ux-rows">
      {quizzes.map((q) => (
        <UxRow
          key={q.id}
          href={`/q/${q.slug}`}
          lead={<NewThumb q={q} />}
          title={q.title}
          sub={`${q.group_name} · ${QUIZ_TYPE_LABEL[q.quiz_type] ?? 'Classic'} · ${levelOf(q.difficulty).label}`}
          end={<span className="ux-num">{ageLabel(q.created_at, now)}</span>}
        />
      ))}
    </div>
  );
}
