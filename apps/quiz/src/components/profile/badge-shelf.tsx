'use client';

import { useState } from 'react';

import { BadgeGrid } from '@/components/ui/badge-grid';
import { badgeIconFor } from '@/lib/badges';

import type { BadgeDefinition } from '@/lib/db/types';

interface Props {
  allBadges: BadgeDefinition[];
  earnedBadgeIds: string[];
}

// Badge shelf (M1.29). Earned-first: the coins you actually own sit out in full
// colour, and everything still locked collapses into one chip that expands the
// full frosted grid inline. Keeps a fresh profile from opening on a wall of
// greyed-out tiles while still showing there is something to chase.
export function BadgeShelf({ allBadges, earnedBadgeIds }: Props): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  if (allBadges.length === 0) return null;

  const earnedSet = new Set(earnedBadgeIds);
  const earned = allBadges.filter((b) => earnedSet.has(b.id));
  const lockedCount = allBadges.length - earned.length;

  return (
    <section className="badge-shelf">
      <style>{SHELF_CSS}</style>

      <div className="badge-shelf-head">
        <p className="badge-shelf-label">Badges</p>
        <span className="badge-shelf-count">{earned.length} earned</span>
      </div>

      <div className="badge-shelf-row">
        {earned.map((b) => {
          const icon = b.icon ?? badgeIconFor(b.id);
          return icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={b.id} src={icon} alt={b.name} title={b.description} className="badge-shelf-coin" loading="lazy" />
          ) : (
            <span key={b.id} className="badge-shelf-chip-art" title={b.description} style={{ background: b.color_bg, borderColor: b.color_stroke, color: b.color_text }}>
              {b.name.slice(0, 1).toUpperCase()}
            </span>
          );
        })}

        {lockedCount > 0 && (
          <button
            type="button"
            className="badge-shelf-more"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor" />
              <path d="M8.2 10.5V7.8a3.8 3.8 0 017.6 0v2.7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            {expanded ? 'Hide' : `${lockedCount} more`}
          </button>
        )}
      </div>

      {expanded && (
        <div className="badge-shelf-grid">
          <BadgeGrid allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />
        </div>
      )}
    </section>
  );
}

const SHELF_CSS = `
.badge-shelf{
  background:var(--surface);border:1px solid var(--border);border-radius:16px;
  box-shadow:var(--shadow-card);padding:16px;margin-top:10px;
}
.badge-shelf-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.badge-shelf-label{
  font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
  color:var(--txt3);margin:0;
}
.badge-shelf-count{font-size:12px;color:var(--txt2);font-variant-numeric:tabular-nums}
.badge-shelf-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
.badge-shelf-coin{width:44px;height:44px;object-fit:contain;flex-shrink:0}
.badge-shelf-chip-art{
  width:44px;height:44px;border-radius:50%;border:1.5px solid;display:grid;place-items:center;
  font-weight:800;font-size:15px;flex-shrink:0;
}
.badge-shelf-more{
  display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;
  border-radius:999px;border:1px solid var(--border);background:transparent;
  color:var(--txt2);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;
  transition:border-color .18s ease,color .18s ease;
}
.badge-shelf-more:hover{border-color:var(--brand);color:var(--brand)}
.badge-shelf-grid{margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
`;
