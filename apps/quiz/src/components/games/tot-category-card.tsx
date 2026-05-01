'use client';

import Link from 'next/link';

interface TotItem {
  id: string;
  name: string;
  image_url: string | null;
  color: string | null;
}

interface TotCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: 'idol' | 'group' | 'song';
  pool_size: number;
  play_count: number;
  tot_items?: TotItem[];
}

function getInitials(name: string) {
  if (!name) return '??';
  const cleaned = name.replace(/[()]/g, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function TotCategoryCard({ category }: { category: TotCategory }) {
  const items = category.tot_items || [];
  const left = items[0];
  const right = items[1] || items[Math.min(1, items.length - 1)];

  const typeLabel =
    category.type === 'idol' ? 'Idols' : category.type === 'group' ? 'Groups' : 'Songs';

  const typeBg = 'rgba(212,83,126,0.95)';

  const leftFallback = '#1a3f7a';
  const rightFallback = '#0a4a36';

  return (
    <Link
      href={`/games/this-or-that/${category.slug}`}
      style={{
        flexShrink: 0, scrollSnapAlign: 'start',
        width: 280, borderRadius: 18, overflow: 'hidden',
        textDecoration: 'none', display: 'block',
        filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.15))`,
        transition: 'transform 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Artwork - two halves with diagonal split */}
      <div style={{
        position: 'relative', height: 220, overflow: 'hidden',
        background: `linear-gradient(110deg, ${left?.color || leftFallback}, ${right?.color || rightFallback})`,
      }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}>
          {/* Left half */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {left?.image_url ? (
              <img src={left.image_url} alt={left.name} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
              }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
                background: `linear-gradient(135deg, ${left?.color || leftFallback}, ${left?.color || leftFallback}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.95)', fontSize: 36, fontWeight: 500,
              }}>
                {getInitials(left?.name || '?')}
              </div>
            )}
          </div>
          {/* Right half */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {right?.image_url ? (
              <img src={right.image_url} alt={right.name} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
              }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
                background: `linear-gradient(135deg, ${right?.color || rightFallback}, ${right?.color || rightFallback}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.95)', fontSize: 36, fontWeight: 500,
              }}>
                {getInitials(right?.name || '?')}
              </div>
            )}
          </div>
        </div>

        {/* Type badge - top right */}
        <span style={{
          position: 'absolute', top: 10, right: 10, zIndex: 7,
          padding: '4px 9px', borderRadius: 9999,
          background: typeBg, color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
        }}>{typeLabel}</span>

        {/* VS medallion - center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 8,
          width: 56, height: 56, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #2A2A2A, #0A0A0A)',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.95), 0 8px 28px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: '0.04em',
        }}>VS</div>

        {/* Left name - bottom left */}
        {left?.name && (
          <span style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 5,
            color: '#fff', fontSize: 13, fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>{left.name}</span>
        )}
        {/* Right name - bottom right */}
        {right?.name && (
          <span style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 5,
            color: '#fff', fontSize: 13, fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>{right.name}</span>
        )}
      </div>

      {/* Dark footer */}
      <div style={{
        background: '#1A1A1A', padding: '12px 14px 14px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff', marginBottom: 4 }}>
          {category.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
            {category.pool_size} {category.type === 'song' ? 'songs' : category.type === 'group' ? 'groups' : 'idols'} {'\u00B7'} {(category.play_count || 0).toLocaleString()} plays
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 9999,
            background: 'rgba(242,192,55,0.18)', color: '#F2C037',
            fontSize: 10, fontWeight: 800,
          }}>{'\u2B50'} +30</span>
        </div>
      </div>
    </Link>
  );
}
