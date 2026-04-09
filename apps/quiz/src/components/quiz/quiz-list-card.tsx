import Link from 'next/link';
import { QuizTypeBadge, mapDbTypeToKey, type QuizTypeKey } from '@/components/ui/quiz-type-badge';
import { formatCount } from '@/lib/utils';

import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
}

const GRADIENT_FROM: Record<QuizTypeKey, string> = {
  classic: '#E6F1FB',
  image: '#FBEAF0',
  intruder: '#EEEDFE',
  tf: '#EAF3DE',
  clue: '#FAEEDA',
};
const GRADIENT_TO: Record<QuizTypeKey, string> = {
  classic: '#EEEDFE',
  image: '#EEEDFE',
  intruder: '#E6F1FB',
  tf: '#FAF2F5',
  clue: '#FBEAF0',
};

/**
 * Simplified list card for the new home page + browse page. Image on the
 * right, title + type badge + plays + avg % on the left. Use this for
 * high-density feeds; the richer QuizCard (with like button, edit button,
 * creator row, fandom pill) is still used on profile, search, and legacy SEO
 * landing pages.
 */
export function QuizListCard({ quiz }: Props) {
  const typeKey = mapDbTypeToKey(quiz.quiz_type);
  const avgPct =
    quiz.total_completions > 0 && quiz.question_count > 0
      ? Math.round(
          (quiz.total_score_sum / quiz.total_completions / quiz.question_count) * 100,
        )
      : null;

  return (
    <Link
      href={`/q/${quiz.slug}`}
      className="flex gap-2.5 p-2.5 bg-surface rounded-xl border border-default items-center hover:border-accent transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary truncate">{quiz.title}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-tertiary mt-[3px] flex-wrap">
          <QuizTypeBadge type={typeKey} size="xs" />
          <span className="tabular-nums">{formatCount(quiz.play_count)} plays</span>
          {avgPct !== null && (
            <span className="text-combo font-semibold tabular-nums">{avgPct}%</span>
          )}
        </div>
      </div>
      <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden bg-elevated">
        {quiz.cover_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={quiz.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${GRADIENT_FROM[typeKey]}, ${GRADIENT_TO[typeKey]})`,
            }}
          />
        )}
      </div>
    </Link>
  );
}
