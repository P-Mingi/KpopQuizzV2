/**
 * The site-signature "VS" badge (Pipeline 1, Section 5c). Reused by the duel
 * grid here and by the B21 matchup motif. Styling lives in `.vs` (globals.css).
 */
export function VsBadge({ className }: { className?: string }): React.ReactElement {
  return (
    <span className={className ? `vs ${className}` : 'vs'} aria-hidden="true">
      VS
    </span>
  );
}
