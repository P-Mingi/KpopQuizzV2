'use client';

import Link from 'next/link';

import { GroupPill } from '@/components/ui/group-pill';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatCount } from '@/lib/utils';

import type { GameCardData } from '@/lib/db/types';

interface GameCardProps {
  game: GameCardData;
}

export function GameCard({ game }: GameCardProps): React.ReactElement {
  return (
    <Link href={`/g/${game.slug}`} className="block">
      <div className="bg-surface-primary border border-border-light rounded-lg p-4 hover:border-border-medium transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {game.group_name && game.display_color && game.text_color && (
                <GroupPill name={game.group_name} displayColor={game.display_color} textColor={game.text_color} />
              )}
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">This or That</span>
            </div>

            <p className="text-base font-medium leading-snug mt-2 text-txt-primary">
              {game.title}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <UserAvatar
                username={game.creator_username}
                avatarUrl={game.creator_avatar_url}
                bgColor={game.creator_avatar_bg}
                textColor={game.creator_avatar_text}
                size={18}
              />
              <span className="text-xs text-txt-secondary">
                {game.creator_username}
              </span>
              <span className="text-xs text-txt-tertiary">&middot;</span>
              <span className="text-xs text-txt-secondary">{formatCount(game.play_count)} plays</span>
              {game.like_count > 0 && (
                <>
                  <span className="text-xs text-txt-tertiary">&middot;</span>
                  <span className="text-xs text-txt-secondary">&hearts; {formatCount(game.like_count)}</span>
                </>
              )}
            </div>
          </div>

          {game.group_name && game.display_color && game.text_color && (
            <div className="flex-shrink-0 ml-3">
              <GroupLogo
                groupName={game.group_name}
                logoUrl={game.logo_url}
                displayColor={game.display_color}
                textColor={game.text_color}
                size={52}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
