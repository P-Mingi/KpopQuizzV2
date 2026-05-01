import type { BadgeDefinition } from '@/lib/db/types';

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  earnedBadgeIds: string[];
}

export function BadgeGrid({ allBadges, earnedBadgeIds }: BadgeGridProps): React.ReactElement {
  const earnedSet = new Set(earnedBadgeIds);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {allBadges.map((badge) => {
        const earned = earnedSet.has(badge.id);

        return (
          <div
            key={badge.id}
            style={{
              padding: 10,
              borderRadius: 10,
              background: earned ? 'var(--bg-accent-subtle)' : 'var(--bg-elevated)',
              border: `1px solid ${earned ? 'var(--accent-light)' : 'var(--border)'}`,
              opacity: earned ? 1 : 0.6,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{earned ? '\uD83C\uDFC6' : '\uD83D\uDD12'}</div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2,
              color: earned ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
              {badge.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
