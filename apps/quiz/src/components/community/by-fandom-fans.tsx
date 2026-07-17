'use client';

import { useState } from 'react';

import { PersonCard, type PersonCardData } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';

// By-fandom showcase (Workstream M, M1.21). The default group's fans are baked at
// ISR time (passed in), so the section is crawlable + the page stays static; the
// chips switch groups via the cheap /api/community/fans endpoint (client only).
// Framed "active fans", NEVER a ranking (no #N / percentile).
export interface Fan { person: PersonCardData; accuracy: number }
export interface FandomGroup { slug: string; name: string; color: string }

export function ByFandomFans({ groups, initialGroup, initialFans }: { groups: FandomGroup[]; initialGroup: string; initialFans: Fan[] }): React.ReactElement {
  const [active, setActive] = useState(initialGroup);
  const [fans, setFans] = useState<Fan[]>(initialFans);
  const [loading, setLoading] = useState(false);

  async function pick(slug: string): Promise<void> {
    if (slug === active) return;
    setActive(slug);
    setLoading(true);
    try {
      const res = await fetch(`/api/community/fans?group=${encodeURIComponent(slug)}`);
      const data = (await res.json()) as { fans: Fan[] };
      setFans(data.fans ?? []);
    } catch {
      setFans([]);
    } finally {
      setLoading(false);
    }
  }

  const activeName = groups.find((g) => g.slug === active)?.name ?? 'this group';

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: '0 0 4px' }}>By fandom</p>
      <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '0 0 12px' }}>Active {activeName} fans, not a ranking.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
        {groups.map((g) => {
          const on = g.slug === active;
          return (
            <button key={g.slug} type="button" onClick={() => void pick(g.slug)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: on ? 'var(--brand)' : 'var(--surface-alt)', color: on ? '#fff' : 'var(--txt1)',
              border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
            }}>{g.name}</button>
          );
        })}
      </div>

      {fans.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
          <Mascot variant="think" size={48} />
          <p style={{ fontSize: 12, color: 'var(--txt2)', margin: 0 }}>No active {activeName} fans yet. Play a {activeName} quiz to be the first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, opacity: loading ? 0.6 : 1 }}>
          {fans.map((f, i) => (
            <div key={f.person.username} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}><PersonCard person={f.person} compact /></div>
              <span style={{ flexShrink: 0, width: 44, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(f.accuracy * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
