import type { BadgeDefinition } from '@/lib/db/types';

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  earnedBadgeIds: string[];
}

function BadgeIcon({ iconType, colorBg, colorStroke }: { iconType: string; colorBg: string; colorStroke: string }): React.ReactElement {
  const paths: Record<string, React.ReactElement> = {
    checkmark: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M4.5 7l1.5 1.5 3.5-3.5" stroke={colorStroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    create: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <rect x="4.5" y="3.5" width="5" height="7" rx="0.5" stroke={colorStroke} strokeWidth="1" />
        <path d="M6 6h2M6 8h2" stroke={colorStroke} strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    ),
    star: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M7 3.5l1 2.1 2.3.3-1.7 1.6.4 2.3L7 8.7l-2 1.1.4-2.3-1.7-1.6 2.3-.3L7 3.5z" fill={colorStroke} />
      </svg>
    ),
    flame: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M7 3.5c0 1.5 2 2.5 2 4a2 2 0 1 1-4 0c0-1.5 2-2.5 2-4z" fill={colorStroke} />
      </svg>
    ),
    stack: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M4.5 5.5h5M4.5 7h5M4.5 8.5h5" stroke={colorStroke} strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    rocket: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M7 3.5v5M5 6.5l2-3 2 3" stroke={colorStroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 10h3" stroke={colorStroke} strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    globe: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <circle cx="7" cy="7" r="2.5" stroke={colorStroke} strokeWidth="0.8" />
        <path d="M4.5 7h5" stroke={colorStroke} strokeWidth="0.8" />
        <path d="M7 4.5v5" stroke={colorStroke} strokeWidth="0.8" />
      </svg>
    ),
    trophy: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M5 4.5h4v2.5a2 2 0 0 1-4 0V4.5z" stroke={colorStroke} strokeWidth="0.9" />
        <path d="M7 9v1.5M5.5 10.5h3" stroke={colorStroke} strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    ),
    heart: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={colorBg} stroke={colorStroke} strokeWidth="1" />
        <path d="M7 10s-2.5-1.5-2.5-3a1.25 1.25 0 0 1 2.5-.4A1.25 1.25 0 0 1 9.5 7c0 1.5-2.5 3-2.5 3z" fill={colorStroke} />
      </svg>
    ),
  };

  return paths[iconType] ?? paths.checkmark!;
}

export function BadgeGrid({ allBadges, earnedBadgeIds }: BadgeGridProps): React.ReactElement {
  const earnedSet = new Set(earnedBadgeIds);

  return (
    <div className="flex flex-wrap gap-2">
      {allBadges.map((badge) => {
        const earned = earnedSet.has(badge.id);

        return (
          <div
            key={badge.id}
            className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-[0.5px] border-border-light bg-surface-primary text-xs font-medium ${
              earned ? '' : 'opacity-35'
            }`}
          >
            <BadgeIcon
              iconType={earned ? badge.icon_type : 'checkmark'}
              colorBg={earned ? badge.color_bg : '#E5E5E5'}
              colorStroke={earned ? badge.color_stroke : '#999'}
            />
            <span style={{ color: earned ? badge.color_text : undefined }} className={earned ? '' : 'text-txt-secondary'}>
              {badge.name}
            </span>
            {!earned && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-txt-primary rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {badge.description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
