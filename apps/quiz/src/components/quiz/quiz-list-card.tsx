import Link from 'next/link';
import Image from 'next/image';
import { QuizTypeBadge, mapDbTypeToKey } from '@/components/ui/quiz-type-badge';
import { QuizTypeIcon } from '@/components/quiz/quiz-type-icon';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';

import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
}

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
          <QuizTypeIcon type={typeKey} size={14} />
          <QuizTypeBadge type={typeKey} size="xs" />
          <span className="tabular-nums">{formatCount(quiz.play_count)} plays</span>
          {avgPct !== null && (
            <span className="text-combo font-semibold tabular-nums">{avgPct}%</span>
          )}
        </div>
      </div>
      {quiz.cover_image_url ? (
        <div className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden bg-elevated">
          <Image
            src={quiz.cover_image_url}
            alt={`${quiz.title} quiz cover`}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
      ) : (
        <GroupLogo
          groupName={quiz.group_name}
          logoUrl={quiz.logo_url}
          displayColor={quiz.display_color}
          textColor={quiz.text_color}
          size={56}
        />
      )}
    </Link>
  );
}
