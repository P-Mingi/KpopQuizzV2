'use client';

import { useState } from 'react';

import { MASTERY, type EraProgress } from '@/lib/passport';

// U-4: the collection card's generation bars. Public /u keeps the compact,
// static bars. Personal /me makes each generation tappable to reveal the groups
// in it with per-group progress toward mastery (plays / accuracy), from the same
// player_group_mastery data the bars already use.
export function CollectionGens({ eras, personal }: { eras: EraProgress[]; personal: boolean }): React.ReactElement {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="pp-gens">
      {eras.map((e) => {
        const pct = e.total > 0 ? (e.mastered / e.total) * 100 : 0;
        const expandable = personal && e.groups.length > 0;
        const isOpen = open === e.era;

        const bars = (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, color: 'var(--txt2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {e.era}
                {expandable && (
                  <svg className={`pp-gen-chev${isOpen ? ' open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                )}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{e.mastered}/{e.total}</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-alt)', overflow: 'hidden' }}>
              <div className="pp-fill" style={{ height: '100%', borderRadius: 999, background: 'var(--brand)', width: `${pct}%` }} />
            </div>
          </>
        );

        return (
          <div key={e.era}>
            {expandable ? (
              <button type="button" className="pp-gen-row" onClick={() => setOpen(isOpen ? null : e.era)} aria-expanded={isOpen}>
                {bars}
              </button>
            ) : (
              bars
            )}

            {isOpen && (
              <ul className="pp-gen-groups">
                {e.groups.map((g) => {
                  const playPct = Math.min(100, Math.round((g.plays / MASTERY.minPlays) * 100));
                  const stat = g.mastered
                    ? 'Mastered'
                    : g.plays > 0
                      ? `${g.plays}/${MASTERY.minPlays} plays · ${Math.round(g.accuracy * 100)}%`
                      : 'Not started';
                  return (
                    <li key={g.id} className="pp-gen-group">
                      <span className="pp-gen-dot" style={{ background: g.color }} aria-hidden="true" />
                      <span className="pp-gen-name">{g.name}</span>
                      <span className={`pp-gen-stat${g.mastered ? ' done' : ''}`}>{stat}</span>
                      <span className="pp-gen-gbar">
                        <span className={`pp-gen-gfill${g.mastered ? ' done' : ''}`} style={{ width: g.mastered ? '100%' : `${playPct}%` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
