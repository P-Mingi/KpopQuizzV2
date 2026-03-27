import Link from 'next/link';

import { getBlindTests } from '@/lib/db/queries/games';
import { formatCount } from '@/lib/utils';
import { calculateDifficulty } from '@/lib/blind-test-utils';

import type { Metadata } from 'next';
import type { GameWithGroup, BlindTestContent } from '@/lib/db/types';

export const metadata: Metadata = {
  title: 'K-pop Blind Tests - Guess the Song',
  description: 'Listen to K-pop song clips and guess the title. Test your ear with blind tests for BTS, BLACKPINK, aespa, and more.',
  alternates: { canonical: '/games' },
};

export const revalidate = 60;

function getThumbnails(game: GameWithGroup, count: number = 4): string[] {
  const content = game.content as BlindTestContent;
  const songs = content.songs ?? [];
  return songs.slice(0, count).map(s => `https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg`);
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)] mb-2.5">
      {children}
    </p>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }): React.ReactElement {
  const cls =
    difficulty === 'easy' ? 'bg-[#EAF3DE] text-[#27500A]' :
    difficulty === 'hard' ? 'bg-[#FCEBEB] text-[#791F1F]' :
    'bg-[#FAEEDA] text-[#633806]';
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {difficulty}
    </span>
  );
}

function FeaturedCard({ game }: { game: GameWithGroup }): React.ReactElement {
  const thumbnails = getThumbnails(game, 4);
  const content = game.content as BlindTestContent;
  const difficulty = content.settings?.difficulty || calculateDifficulty(content.songs);

  return (
    <Link href={`/g/${game.slug}`}>
      <div className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl overflow-hidden hover:border-[var(--border-medium)] transition-colors mb-4">
        {/* Thumbnail mosaic */}
        <div className="flex h-20 overflow-hidden">
          {thumbnails.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="flex-1 object-cover object-center"
              style={{ minWidth: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.background = 'var(--bg-secondary)'; (e.target as HTMLImageElement).src = ''; }}
            />
          ))}
        </div>

        <div className="p-4">
          <div className="flex gap-1.5 mb-1.5">
            {game.group_name && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: game.display_color ?? '#F8F7F4', color: game.text_color ?? '#6B6B6B' }}
              >
                {game.group_name}
              </span>
            )}
            <DifficultyBadge difficulty={difficulty} />
          </div>

          <p className="text-base font-medium mb-1.5">{game.title}</p>

          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>{content.songs.length} songs · {content.settings.clip_duration}s clips</span>
            <span>{formatCount(game.play_count)} plays</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function BlindTestCard({ game }: { game: GameWithGroup }): React.ReactElement {
  const thumbnails = getThumbnails(game, 4);
  const content = game.content as BlindTestContent;
  const difficulty = content.settings?.difficulty || calculateDifficulty(content.songs);
  const isHard = difficulty === 'hard';

  return (
    <Link href={`/g/${game.slug}`}>
      <div className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl overflow-hidden hover:border-[var(--border-medium)] transition-colors flex">
        {/* Thumbnail area */}
        {isHard ? (
          <div className="w-[90px] flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center">
            <div className="flex gap-[2px] items-end h-[30px]">
              {[12, 22, 30, 18, 8].map((h, i) => (
                <div key={i} className="w-[3px] rounded-sm bg-[#E24B4A]" style={{ height: h }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-[90px] flex-shrink-0 grid grid-cols-2 grid-rows-2">
            {thumbnails.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-10 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.background = 'var(--bg-secondary)'; (e.target as HTMLImageElement).src = ''; }}
              />
            ))}
          </div>
        )}

        {/* Text */}
        <div className="p-3 flex-1 min-w-0">
          <div className="flex gap-1 mb-1">
            {game.group_name && (
              <span
                className="text-[10px] font-medium px-1.5 py-px rounded-full"
                style={{ backgroundColor: game.display_color ?? '#F8F7F4', color: game.text_color ?? '#6B6B6B' }}
              >
                {game.group_name}
              </span>
            )}
            <DifficultyBadge difficulty={difficulty} />
          </div>
          <p className="text-sm font-medium mb-1 truncate">{game.title}</p>
          <div className="flex justify-between text-[11px] text-[var(--text-tertiary)]">
            <span>{content.songs.length} songs · {content.settings.clip_duration}s</span>
            <span>{formatCount(game.play_count)} plays</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function GamesPage(): Promise<React.ReactElement> {
  const blindTests = await getBlindTests();

  const totalSongs = blindTests.reduce((sum, g) => sum + ((g.content as BlindTestContent).songs?.length ?? 0), 0);
  const totalPlays = blindTests.reduce((sum, g) => sum + g.play_count, 0);

  const featured = blindTests.length > 1 ? blindTests[0] : null;
  const rest = featured ? blindTests.slice(1) : blindTests;

  return (
    <div className="py-6">
      {/* Header */}
      <h1 className="text-2xl font-medium mb-1">Blind test</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Listen to a clip. Guess the song. No peeking.
      </p>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{totalSongs}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">songs</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{blindTests.length}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">tests</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{formatCount(totalPlays)}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">plays</p>
        </div>
      </div>

      {/* Featured */}
      {featured && (
        <>
          <SectionLabel>Featured</SectionLabel>
          <FeaturedCard game={featured} />
        </>
      )}

      {/* All blind tests */}
      {rest.length > 0 && (
        <>
          {featured && <SectionLabel>All blind tests</SectionLabel>}
          <div className="space-y-2.5 mb-6">
            {rest.map(game => (
              <BlindTestCard key={game.id} game={game} />
            ))}
          </div>
        </>
      )}

      {/* Top players - empty state for now */}
      <SectionLabel>Top players</SectionLabel>
      <div className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl p-4">
        <div className="text-center py-4">
          <p className="text-sm text-[var(--text-tertiary)] mb-0.5">No plays yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">Be the first to play and claim the top spot</p>
        </div>
      </div>

      {/* Empty state */}
      {blindTests.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-medium mb-2">Coming soon</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Blind tests are being prepared. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
