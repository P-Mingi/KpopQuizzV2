'use client';

import { useState } from 'react';

import { PersonCard, type PersonCardData } from '@/components/profile/person-card';

// F1.9 - Hall of Fame. The rising / top-creators / legends stack collapses into
// one tabbed card (extends the M1.21 TopCreatorsTabs pattern to four tabs). Data
// is baked at ISR and passed in; only the tab toggle is client.
//
// MIN_BOARD per tab: a tab with fewer than 4 entries does not render its button
// at all, and if no tab qualifies the whole card hides. No thin, sad rankings.
const MIN_BOARD = 4;

export interface HofRow { person: PersonCardData; stat: string }

export interface HofTab {
  key: string;
  label: string;
  rows: HofRow[];
  /** Rising shows follow buttons; the ranked boards do not. */
  showFollow?: boolean;
}

export function HallOfFame({ tabs }: { tabs: HofTab[] }): React.ReactElement | null {
  const live = tabs.filter((t) => t.rows.length >= MIN_BOARD);
  const [active, setActive] = useState(0);
  if (live.length === 0) return null;

  const current = live[Math.min(active, live.length - 1)]!;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <p style={seclab}>Hall of Fame</p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {live.map((t, i) => {
            const on = i === Math.min(active, live.length - 1);
            return (
              <button key={t.key} type="button" onClick={() => setActive(i)} style={{
                fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                background: on ? 'var(--brand-btn)' : 'transparent', color: on ? '#fff' : 'var(--txt2)',
                border: `1px solid ${on ? 'var(--brand-btn)' : 'var(--border)'}`,
                transition: 'background .16s ease, color .16s ease',
              }}>{t.label}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {current.rows.map((r, i) => (
          <div key={r.person.username} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}><PersonCard person={r.person} compact showFollow={current.showFollow ?? false} /></div>
            <span style={{ flexShrink: 0, width: 80, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>{r.stat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};
