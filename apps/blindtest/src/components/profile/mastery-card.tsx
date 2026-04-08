interface Props {
  name: string;
  stars: number; // 0..5
  plays: number;
}

/**
 * Single mastery tile in the profile mastery grid.
 */
export function MasteryCard({ name, stars, plays }: Props) {
  const starString = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  return (
    <div className="px-2.5 py-2.5 rounded-[10px] bg-surface border border-default">
      <p className="text-[11px] font-medium text-primary truncate">{name}</p>
      <p className="text-[10px] text-combo mt-0.5 tabular-nums">{starString}</p>
      <p className="text-[9px] text-ghost mt-0.5">{plays} {plays === 1 ? 'play' : 'plays'}</p>
    </div>
  );
}
