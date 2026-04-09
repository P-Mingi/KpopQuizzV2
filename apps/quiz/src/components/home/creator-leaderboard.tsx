import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';

import type { TopCreator } from '@/lib/db/types';

interface CreatorLeaderboardProps {
  creators: TopCreator[];
}

export function CreatorLeaderboard({ creators }: CreatorLeaderboardProps): React.ReactElement {
  if (creators.length === 0) return <></>;

  return (
    <div className="border-t border-default pt-6 mt-6">
      <p className="text-sm font-medium text-secondary mb-3">Top quiz creators this week</p>

      <div>
        {creators.map((creator, i) => (
          <div key={creator.username} className="flex items-center gap-3 py-2">
            <span className="text-xs text-tertiary min-w-[16px]">#{i + 1}</span>
            <UserAvatar
              username={creator.username}
              avatarUrl={creator.avatar_url}
              bgColor={creator.avatar_bg}
              textColor={creator.avatar_text}
              size={28}
            />
            <Link
              href={`/u/${creator.username}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {creator.username}
            </Link>
            <span className="text-xs text-secondary ml-2">
              {creator.total_quizzes_created} quizzes · {creator.weekly_plays} plays this week
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
