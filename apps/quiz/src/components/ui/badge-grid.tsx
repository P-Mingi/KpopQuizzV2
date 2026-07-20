'use client';

import { BADGE_TIER_GROUPS, badgeIconFor, isTieredBadge } from '@/lib/badges';

import type { BadgeDefinition } from '@/lib/db/types';

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  earnedBadgeIds: string[];
  /** When provided, every tile becomes a button that opens the badge lightbox. */
  onSelect?: (badge: BadgeDefinition) => void;
}

/**
 * M1.15 final. Renders the real badge art from badge_definitions.icon: earned
 * badges in full colour, locked ones desaturated with a lock chip so the shelf
 * still reads as "here is what there is to earn". Tiered families (streak,
 * creator) get their own labelled row so the ladder is legible.
 */
export function BadgeGrid({ allBadges, earnedBadgeIds, onSelect }: BadgeGridProps): React.ReactElement {
  const earned = new Set(earnedBadgeIds);
  const byId = new Map(allBadges.map((b) => [b.id, b]));

  const singles = allBadges.filter((b) => !isTieredBadge(b.id));
  const groups = BADGE_TIER_GROUPS.map((g) => ({
    ...g,
    badges: g.ids.map((id) => byId.get(id)).filter((b): b is BadgeDefinition => Boolean(b)),
  })).filter((g) => g.badges.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{BADGE_CSS}</style>

      {singles.length > 0 && (
        <div className="badge-grid">
          {singles.map((b) => (
            <BadgeTile key={b.id} badge={b} earned={earned.has(b.id)} onSelect={onSelect} />
          ))}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key}>
          <p className="badge-group-label">{g.label}</p>
          <div className="badge-grid">
            {g.badges.map((b) => (
              <BadgeTile key={b.id} badge={b} earned={earned.has(b.id)} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BadgeTile({ badge, earned, onSelect }: { badge: BadgeDefinition; earned: boolean; onSelect?: ((b: BadgeDefinition) => void) | undefined }): React.ReactElement {
  const icon = badge.icon ?? badgeIconFor(badge.id);

  const Tag = onSelect ? 'button' : 'div';
  return (
    <Tag
      className={`badge-tile ${earned ? 'is-earned' : 'is-locked'}`}
      title={badge.description}
      {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(badge) } : {})}
    >
      <div className="badge-art">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="badge-img" loading="lazy" draggable={false} />
        ) : (
          // No art for this badge yet: keep the coloured chip as a placeholder.
          <span
            className="badge-fallback"
            style={{ background: badge.color_bg, borderColor: badge.color_stroke, color: badge.color_text }}
            aria-hidden="true"
          >
            {badge.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        {!earned && (
          <span className="badge-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor" />
              <path d="M8.2 10.5V7.8a3.8 3.8 0 017.6 0v2.7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </div>
      <span className="badge-name">{badge.name}</span>
      <span className="sr-only">{earned ? 'Earned' : 'Locked'}</span>
    </Tag>
  );
}

const BADGE_CSS = `
.badge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (min-width: 560px) { .badge-grid { grid-template-columns: repeat(4, 1fr); } }
.badge-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--txt3); margin: 0 0 8px;
}
.badge-tile {
  font-family: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 6px 9px; border-radius: 14px;
  border: 1px solid var(--border); background: var(--surface-alt);
}
button.badge-tile { cursor: pointer; }
.badge-tile.is-earned { border-color: color-mix(in srgb, var(--brand) 32%, var(--border)); background: var(--surface); }
.badge-art { position: relative; width: 100%; aspect-ratio: 1; display: grid; place-items: center; }
.badge-img { width: 100%; height: 100%; object-fit: contain; }
/* Locked art is deliberately hard to read: a frosted silhouette shows there is
   something to earn without spoiling the artwork before it is unlocked. */
.badge-tile.is-locked .badge-img { filter: grayscale(1) blur(5px) contrast(0.5); opacity: 0.3; }
.badge-fallback {
  width: 62%; aspect-ratio: 1; border-radius: 50%; border: 1.5px solid;
  display: grid; place-items: center; font-weight: 800; font-size: 15px;
}
.badge-tile.is-locked .badge-fallback { filter: grayscale(1) blur(4px); opacity: 0.32; }
.badge-lock {
  position: absolute; right: 2px; bottom: 2px; width: 19px; height: 19px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--surface); color: var(--txt3);
  box-shadow: 0 0 0 1px var(--border);
}
.badge-name {
  font-size: 10.5px; font-weight: 600; line-height: 1.15; text-align: center;
  color: var(--txt2);
}
.badge-tile.is-earned .badge-name { color: var(--txt1); }
.badge-tile.is-locked .badge-name { opacity: 0.62; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;
