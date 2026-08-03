'use client';

import { BADGE_TIER_GROUPS, BADGE_CATEGORY_ORDER, badgeCategory } from '@/lib/badges';
import { tierMetaFor } from '@/lib/badges/catalog';
import { BadgeCoin } from '@/components/profile/badge-coin';

import type { BadgeDefinition } from '@/lib/db/types';
import type { BadgeMetric } from '@/lib/badges/catalog';

export type BadgeMetrics = Record<BadgeMetric, number>;

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  earnedBadgeIds: string[];
  /** The profile owner's metric values, so a LOCKED tiered badge shows its next
   * target as "X / Y". Absent -> locked badges show only their name. */
  metrics?: BadgeMetrics | undefined;
  /** When provided, every tile becomes a button that opens the badge lightbox. */
  onSelect?: (badge: BadgeDefinition) => void;
}

/**
 * V-UPGRADE-1 A4. The full badge board: every badge grouped by WORLD (Play / Verse
 * / Cross-world), earned in full colour and LOCKED shown as a target - a tiered
 * badge carries its next threshold as "31 / 50" so the grind is legible. Tiered
 * families still render as their own labelled ladder within a world.
 */
export function BadgeGrid({ allBadges, earnedBadgeIds, metrics, onSelect }: BadgeGridProps): React.ReactElement {
  const earned = new Set(earnedBadgeIds);
  const byId = new Map(allBadges.map((b) => [b.id, b]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{BADGE_CSS}</style>

      {BADGE_CATEGORY_ORDER.map((cat) => {
        const inCat = allBadges.filter((b) => badgeCategory(b.id) === cat.key);
        if (inCat.length === 0) return null;
        // Tier-family ladders that belong to this world, then the loose singles.
        const ladders = BADGE_TIER_GROUPS
          .map((g) => ({ ...g, badges: g.ids.map((id) => byId.get(id)).filter((b): b is BadgeDefinition => Boolean(b)) }))
          .filter((g) => g.badges.length > 0 && badgeCategory(g.badges[0]!.id) === cat.key);
        const laddered = new Set(ladders.flatMap((g) => g.badges.map((b) => b.id)));
        const singles = inCat.filter((b) => !laddered.has(b.id));

        return (
          <section key={cat.key} className="badge-cat">
            <p className="badge-cat-label">{cat.label}</p>
            {singles.length > 0 && (
              <div className="badge-grid">
                {singles.map((b) => <BadgeTile key={b.id} badge={b} earned={earned.has(b.id)} metrics={metrics} onSelect={onSelect} />)}
              </div>
            )}
            {ladders.map((g) => (
              <div key={g.key} className="badge-ladder">
                <p className="badge-group-label">{g.label}</p>
                <div className="badge-grid">
                  {g.badges.map((b) => <BadgeTile key={b.id} badge={b} earned={earned.has(b.id)} metrics={metrics} onSelect={onSelect} />)}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** The "X / Y" progress toward a locked tiered badge (null if earned, one-time, or
 * we have no metrics). Caps the numerator at the threshold. */
export function badgeProgress(badgeId: string, metrics: BadgeMetrics | undefined): { current: number; threshold: number; noun: string } | null {
  if (!metrics) return null;
  const meta = tierMetaFor(badgeId);
  if (!meta || meta.threshold <= 1) return null; // one-time badges have no ladder
  return { current: Math.min(metrics[meta.metric] ?? 0, meta.threshold), threshold: meta.threshold, noun: meta.noun };
}

function BadgeTile({ badge, earned, metrics, onSelect }: { badge: BadgeDefinition; earned: boolean; metrics?: BadgeMetrics | undefined; onSelect?: ((b: BadgeDefinition) => void) | undefined }): React.ReactElement {
  const Tag = onSelect ? 'button' : 'div';
  const prog = earned ? null : badgeProgress(badge.id, metrics);
  return (
    <Tag
      className={`badge-tile ${earned ? 'is-earned' : 'is-locked'}`}
      title={prog ? `${badge.description} (${prog.current} of ${prog.threshold})` : badge.description}
      {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(badge) } : {})}
    >
      <div className="badge-art">
        <BadgeCoin id={badge.id} earned={earned} size={50} />
      </div>
      <span className="badge-name">{badge.name}</span>
      {prog ? (
        <span className="badge-progress"><span className="badge-progress-have">{prog.current.toLocaleString('en-US')}</span> / {prog.threshold.toLocaleString('en-US')}</span>
      ) : null}
      <span className="sr-only">{earned ? 'Earned' : prog ? `Locked, ${prog.current} of ${prog.threshold}` : 'Locked'}</span>
    </Tag>
  );
}

const BADGE_CSS = `
.badge-cat-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--txt2); margin: 0 0 10px; }
.badge-ladder { margin-top: 12px; }
.badge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (min-width: 560px) { .badge-grid { grid-template-columns: repeat(4, 1fr); } }
.badge-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--txt3); margin: 0 0 8px;
}
.badge-tile {
  font-family: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
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
.badge-progress {
  font-size: 10px; font-weight: 600; color: var(--txt3); font-variant-numeric: tabular-nums; letter-spacing: .02em;
}
.badge-progress-have { color: var(--brand); font-weight: 800; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;
