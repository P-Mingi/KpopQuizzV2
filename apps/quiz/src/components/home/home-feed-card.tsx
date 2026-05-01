import Link from 'next/link';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';
import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
}

export function HomeFeedCard({ quiz }: Props) {
  return (
    <Link href={`/q/${quiz.slug}`} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: 16,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-card)',
      textDecoration: 'none', color: 'inherit',
      transition: 'border-color 150ms ease, transform 150ms ease',
    }}>
      {/* Group logo thumbnail */}
      <GroupLogo
        groupName={quiz.group_name}
        logoUrl={quiz.logo_url}
        displayColor={quiz.display_color}
        textColor={quiz.text_color}
        size={56}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <QuizTypeBadge type={quiz.quiz_type} size="xs" />
          <DifficultyBadge difficulty={quiz.difficulty} />
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {quiz.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <UserAvatar
              username={quiz.creator_username}
              avatarUrl={quiz.creator_avatar_url}
              bgColor={quiz.creator_avatar_bg}
              textColor={quiz.creator_avatar_text}
              size={16}
            />
            {quiz.creator_username}
          </span>
          <span>{'\u00B7'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            {formatCount(quiz.play_count)}
          </span>
          <span>{'\u00B7'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {formatCount(quiz.like_count)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
        background: 'var(--bg-elevated)', color: 'var(--text-primary)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </Link>
  );
}
