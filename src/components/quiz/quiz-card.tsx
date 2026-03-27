import Link from 'next/link';

import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LikeButton } from '@/components/ui/like-button';
import { formatCount } from '@/lib/utils';

import type { QuizCardData } from '@/lib/db/types';

interface QuizCardProps {
  quiz: QuizCardData;
  isOwner?: boolean;
  isLiked?: boolean;
}

export function QuizCard({ quiz, isOwner, isLiked = false }: QuizCardProps): React.ReactElement {
  const avgPct = quiz.total_completions > 0 && quiz.question_count > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / quiz.question_count * 100)
    : null;

  return (
    <div className="relative bg-surface-primary border border-border-light rounded-lg p-4 hover:border-border-medium transition-colors">
      {/* Invisible stretched link for the whole card */}
      <Link href={`/q/${quiz.slug}`} className="absolute inset-0 z-0 rounded-lg" aria-label={quiz.title} tabIndex={-1} />

      <div className="flex justify-between items-start relative pointer-events-none">
        {/* Left: content */}
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <GroupPill name={quiz.group_name} displayColor={quiz.display_color} textColor={quiz.text_color} />
            <DifficultyBadge difficulty={quiz.difficulty} />
          </div>

          <p className="text-base font-medium leading-snug mb-2 text-txt-primary">{quiz.title}</p>

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
              · avg {avgPct !== null ? `${avgPct}%` : <span className="text-txt-tertiary">new</span>}
            </span>
            <span className="text-xs text-txt-secondary">·</span>
            <span className="relative z-10 pointer-events-auto">
              <LikeButton quizId={quiz.id} initialLiked={isLiked} initialCount={quiz.like_count} />
            </span>
          </div>
        </div>

        {/* Right: edit button + logo + play count */}
        <div className="flex flex-col items-center flex-shrink-0">
          {isOwner && (
            <div className="flex items-center gap-1.5 mb-1 relative z-10 pointer-events-auto">
              <Link
                href={`/create?edit=${quiz.id}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-txt-secondary hover:bg-surface-secondary transition-colors"
                aria-label="Edit quiz"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.08 1.92a1.25 1.25 0 0 1 1.77 0l.23.23a1.25 1.25 0 0 1 0 1.77L5.33 10.67l-2.5.56.56-2.5 6.69-6.81Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          )}
          <GroupLogo
            groupName={quiz.group_name}
            logoUrl={quiz.logo_url}
            displayColor={quiz.display_color}
            textColor={quiz.text_color}
            size={52}
          />
          <span className="text-xs text-txt-secondary mt-1.5 whitespace-nowrap">
            {formatCount(quiz.play_count)} plays
          </span>
        </div>
      </div>
    </div>
  );
}
