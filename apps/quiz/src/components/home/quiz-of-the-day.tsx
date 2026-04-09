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
    <Link href={`/q/${quiz.slug}`} className="block mb-6">
      <div className="rounded-2xl overflow-hidden border border-[#F4C0D1] bg-primary hover:border-[#ED93B1] transition-colors">
        <div className="h-[3px] bg-[#ED93B1]" />

        <div className="p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="#ED93B1" aria-hidden="true">
              <polygon points="7,1 9,5 13,5.5 10,8.5 10.8,13 7,11 3.2,13 4,8.5 1,5.5 5,5" />
            </svg>
            <span className="text-[11px] font-medium text-[#993556]">
              Quiz of the day
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <GroupPill name={quiz.group_name} displayColor={quiz.display_color} textColor={quiz.text_color} />
            <DifficultyBadge difficulty={quiz.difficulty} />
            <span className="text-xs text-secondary ml-auto">{formatCount(quiz.play_count)} plays</span>
          </div>

          <p className="text-lg font-medium leading-snug mb-2 text-primary">{quiz.title}</p>

          <div className="flex items-center gap-2">
            <UserAvatar
              username={quiz.creator_username}
              avatarUrl={quiz.creator_avatar_url}
              bgColor={quiz.creator_avatar_bg}
              textColor={quiz.creator_avatar_text}
              size={22}
            />
            <span className="text-xs text-secondary">
              by <span className="font-medium text-primary">{quiz.creator_username}</span>
            </span>
            <span className="text-xs text-secondary">
              · avg score {avgPct !== null ? `${avgPct}%` : <span className="text-tertiary">new</span>}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
