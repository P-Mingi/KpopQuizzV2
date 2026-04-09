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
 * Wide banner card used in the horizontal "Trending this week" scroller on
 * the home page. Shows a cover banner (or a type-tinted gradient fallback),
 * type badge, plays and avg-score chips, then title + creator.
 */
export function TrendingCard({ quiz }: Props) {
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
      className="block w-[220px] flex-shrink-0 bg-surface rounded-[14px] overflow-hidden border border-default hover:border-accent transition-colors"
    >
      {/* Banner */}
      <div className="h-[100px] relative overflow-hidden">
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

        {/* Bottom-dark gradient so text is readable on top of the cover */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)' }}
        />

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <QuizTypeBadge type={typeKey} size="sm" className="backdrop-blur-sm" />
        </div>

        {/* Plays + rating chips */}
        <span className="absolute bottom-2 right-2 text-[10px] text-white font-medium tabular-nums drop-shadow">
          {formatCount(quiz.play_count)} plays
        </span>
        {avgPct !== null && (
          <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-combo drop-shadow tabular-nums">
            {avgPct}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-primary line-clamp-2 leading-tight">
          {quiz.title}
        </p>
        <p className="text-[10px] text-tertiary mt-[3px] truncate">by {quiz.creator_username}</p>
      </div>
    </Link>
  );
}
