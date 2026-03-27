import Link from 'next/link';

import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatCount } from '@/lib/utils';

import type { QuizCardData } from '@/lib/db/types';

interface QuizOfTheDayProps {
  quiz: QuizCardData;
}

export function QuizOfTheDay({ quiz }: QuizOfTheDayProps): React.ReactElement {
  const avgPct = quiz.total_completions > 0 && quiz.question_count > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / quiz.question_count * 100)
    : null;

  return (
    <Link href={`/q/${quiz.slug}`} className="block bg-surface-primary rounded-lg border border-border-light p-5 mb-6 hover:border-border-medium transition-colors">
      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent-pink-light text-accent-pink-dark mb-3">
        quiz of the day
      </span>

      <div className="flex items-center gap-2 mb-2.5">
        <GroupPill name={quiz.group_name} displayColor={quiz.display_color} textColor={quiz.text_color} />
        <DifficultyBadge difficulty={quiz.difficulty} />
        <span className="text-xs text-txt-secondary ml-auto">{formatCount(quiz.play_count)} plays</span>
      </div>

      <p className="text-lg font-medium leading-snug mb-2 text-txt-primary">{quiz.title}</p>

      <div className="flex items-center gap-2">
        <UserAvatar
          username={quiz.creator_username}
          avatarUrl={quiz.creator_avatar_url}
          bgColor={quiz.creator_avatar_bg}
          textColor={quiz.creator_avatar_text}
          size={22}
        />
        <span className="text-xs text-txt-secondary">
          by <span className="font-medium text-txt-primary">{quiz.creator_username}</span>
        </span>
        <span className="text-xs text-txt-secondary">
          · avg score {avgPct !== null ? `${avgPct}%` : <span className="text-txt-tertiary">new</span>}
        </span>
      </div>
    </Link>
  );
}
