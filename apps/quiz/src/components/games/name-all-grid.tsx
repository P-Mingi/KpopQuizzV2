import { NameAllCard, type NameAllGame } from './name-all-card';

/**
 * Uniform responsive grid of name-all cards. Every card is the same size now
 * (no full-width spanning), so the page scans as a clean, even grid.
 */
export function NameAllGrid({ games }: { games: NameAllGame[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {games.map((game) => (
        <NameAllCard key={game.id} game={game} />
      ))}
    </div>
  );
}
