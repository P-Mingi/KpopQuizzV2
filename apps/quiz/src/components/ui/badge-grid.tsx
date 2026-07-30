'use client';

import { BADGE_TIER_GROUPS, isTieredBadge } from '@/lib/badges';
import { BadgeCoin } from '@/components/profile/badge-coin';

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
  const Tag = onSelect ? 'button' : 'div';
  return (
    <Tag
      className={`badge-tile ${earned ? 'is-earned' : 'is-locked'}`}
      title={badge.description}
      {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(badge) } : {})}
    >
      <div className="badge-art">
        <BadgeCoin id={badge.id} earned={earned} size={50} />
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
