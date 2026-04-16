import { NameAllCard, type NameAllGame } from './name-all-card';

/**
 * Two-column grid that handles col-span-2 cards (member games + 6-13 item idol/song games)
 * via grid-auto-flow: dense so single and double-width cards pack nicely.
 * Mobile collapses to single column; col-span-2 cards stay full-width on both.
 */
export function NameAllGrid({ games }: { games: NameAllGame[] }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      style={{ gridAutoFlow: 'dense' }}
    >
      {games.map((game) => (
        <NameAllCard key={game.id} game={game} />
      ))}
    </div>
  );
}
