import type { Metadata } from 'next';

import { Logo } from '@/components/layout/logo';
import { VERSE_DIRECTIONS } from '@/components/verse/brand/verse-wordmarks';

// V-IDENTITY step 1 - internal brand-direction gallery. Static, noindex,
// allowlisted under /verse. Removed or kept noindex after the owner picks.
export const metadata: Metadata = {
  title: 'Verse wordmark directions (internal)',
  robots: { index: false, follow: false },
};

type Direction = (typeof VERSE_DIRECTIONS)[number];

function Panel({ ground, dir }: { ground: 'light' | 'dark'; dir: Direction }): React.ReactElement {
  const isDark = ground === 'dark';
  const bg = isDark ? '#141018' : '#ffffff';
  const ink = isDark ? '#f4f1f8' : '#171421';
  const sub = isDark ? '#9b95a9' : '#6b6577';
  const og = isDark ? '#0d0a12' : '#f5f3f8';
  const line = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  const { FaviconMark, Lockup } = dir;
  return (
    <div style={{ background: bg, color: ink, borderRadius: 16, padding: '20px 22px', border: `1px solid ${line}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: sub, marginBottom: 18 }}>{ground} · header + toggle neighbour</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
        <Lockup height={28} color={ink} />
        <span style={{ color: sub, fontSize: 16 }}>|</span>
        <span style={{ color: ink }}><Logo bare size="sm" /></span>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: sub, marginBottom: 12 }}>favicon 32 · 20 · 16</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
        <FaviconMark size={32} /><FaviconMark size={20} /><FaviconMark size={16} />
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: sub, marginBottom: 10 }}>og-card scale</div>
      <div style={{ borderRadius: 12, padding: '30px 24px', background: og, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lockup height={58} color={ink} />
      </div>
    </div>
  );
}

export default function VerseBrandPage(): React.ReactElement {
  return (
    <div className="verse-scope" style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 4px 96px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-tertiary)' }}>Verse · internal · noindex</p>
      <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '6px 0 10px', color: 'var(--text-primary)' }}>Wordmark directions</h1>
      <p style={{ maxWidth: '64ch', fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        Three distinct concepts for the Verse mark, house-drawn in flat violet (no gradients, no new fonts: Pretendard lettering + custom SVG). Each is shown light and dark, at header, favicon, and OG-card scale, next to the KpopQuiz Play brand for the toggle-neighbour test. They differ in concept, not just colour. Pick one, or ask for iteration.
      </p>

      {VERSE_DIRECTIONS.map((dir, i) => (
        <section key={dir.id} style={{ marginTop: 52 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--verse-brand, #7c5cfc)', fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{dir.name}</h2>
          </div>
          <p style={{ maxWidth: '64ch', fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--text-secondary)', margin: '6px 0 18px' }}>{dir.concept}</p>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <Panel ground="light" dir={dir} />
            <Panel ground="dark" dir={dir} />
          </div>
        </section>
      ))}

      <p style={{ marginTop: 56, fontSize: '0.85rem', color: 'var(--text-tertiary)', maxWidth: '64ch' }}>
        Note: all three harmonise with the violet world identity and are built to sit quietly beside the pink Play brand in the Play | Verse toggle. This page is noindex and allowlisted under /verse; it is removed or kept noindex once a direction is chosen.
      </p>
    </div>
  );
}
