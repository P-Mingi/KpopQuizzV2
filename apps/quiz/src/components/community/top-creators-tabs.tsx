'use client';

import { useState } from 'react';

import { PersonCard, type PersonCardData } from '@/components/profile/person-card';

// Top creators (Workstream M, M1.21). Week + all-time, light list (no podium, no
// #N). Data is ISR-baked server-side and passed in; only the tab toggle is client.
export interface RankedPerson { person: PersonCardData; stat: string }

export function TopCreatorsTabs({ week, allTime }: { week: RankedPerson[]; allTime: RankedPerson[] }): React.ReactElement {
  const [tab, setTab] = useState<'week' | 'all'>('week');
  const list = tab === 'week' ? week : allTime;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0 }}>Top creators</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['week', 'all'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t ? 'var(--brand)' : 'transparent', color: tab === t ? '#fff' : 'var(--txt2)',
              border: `1px solid ${tab === t ? 'var(--brand)' : 'var(--border)'}`,
            }}>{t === 'week' ? 'This week' : 'All time'}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {list.map((r, i) => (
          <div key={r.person.username} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}><PersonCard person={r.person} compact /></div>
            <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>{r.stat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
