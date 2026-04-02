import { GamePlayer } from '@/components/game/game-player';

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ playlist?: string; mode?: string; difficulty?: string }> }) {
  const params = await searchParams;
  const playlist = params.playlist ?? 'all';
  const mode = params.mode ?? 'quick';
  const difficulty = params.difficulty ?? 'all';

  return (
    <GamePlayer
      playlist={playlist}
      mode={mode}
      difficulty={difficulty}
    />
  );
}
