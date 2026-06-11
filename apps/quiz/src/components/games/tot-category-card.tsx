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

const STAR_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.6l2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 17.02l-5.67 2.98 1.08-6.31-4.59-4.47 6.34-.92z" />
  </svg>
);

/**
 * This-or-That list card. Keeps its signature bold identity: a full-bleed VS
 * head-to-head cover with a dark footer (distinct from the light name-all card).
 * Refined: image zoom on hover, a readability scrim, token-aware accents.
 */
export function TotCategoryCard({ category }: { category: TotCategory }) {
  const items = category.tot_items || [];
  const left = items[0];
  const right = items[1] || items[Math.min(1, items.length - 1)];

  const typeLabel =
    category.type === 'idol' ? 'Idols' : category.type === 'group' ? 'Groups' : 'Songs';
  const noun = category.type === 'song' ? 'songs' : category.type === 'group' ? 'groups' : 'idols';

  const leftColor = left?.color || '#1a3f7a';
  const rightColor = right?.color || '#0a4a36';

  return (
    <Link
      href={`/games/this-or-that/${category.slug}`}
      aria-label={`${category.title}, this or that game`}
      className="group block w-full rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      style={{ filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.16))' }}
    >
      {/* VS artwork: two halves with a slight diagonal seam */}
      <div
        className="relative h-[200px] overflow-hidden"
        style={{ background: `linear-gradient(110deg, ${leftColor}, ${rightColor})` }}
      >
        <div className="grid grid-cols-2 h-full">
          {/* Left half */}
          <div className="relative overflow-hidden">
            {left?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={left.image_url}
                alt={left.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.06]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)' }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center text-white/95 text-4xl font-medium"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
                  background: `linear-gradient(135deg, ${leftColor}, ${leftColor}cc)`,
                }}
              >
                {getInitials(left?.name || '?')}
              </div>
            )}
          </div>
          {/* Right half */}
          <div className="relative overflow-hidden">
            {right?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={right.image_url}
                alt={right.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.06]"
                style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center text-white/95 text-4xl font-medium"
                style={{
                  clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
                  background: `linear-gradient(135deg, ${rightColor}, ${rightColor}cc)`,
                }}
              >
                {getInitials(right?.name || '?')}
              </div>
            )}
          </div>
        </div>

        {/* Bottom scrim for name legibility */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-[3]" />

        {/* Type pill - top right */}
        <span
          className="absolute top-2.5 right-2.5 z-[7] px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white"
          style={{ background: 'var(--accent)' }}
        >
          {typeLabel}
        </span>

        {/* VS medallion - center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[8] w-14 h-14 rounded-full flex items-center justify-center text-white text-[17px] font-black tracking-wide transition-transform duration-200 group-hover:scale-105"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #2A2A2A, #0A0A0A)',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.95), 0 8px 24px rgba(0,0,0,0.55)',
          }}
        >
          VS
        </div>

        {/* Contestant names */}
        {left?.name && (
          <span className="absolute bottom-3 left-3 z-[5] max-w-[42%] truncate text-white text-[13px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
            {left.name}
          </span>
        )}
        {right?.name && (
          <span className="absolute bottom-3 right-3 z-[5] max-w-[42%] truncate text-right text-white text-[13px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
            {right.name}
          </span>
        )}
      </div>

      {/* Dark footer (signature ToT look) */}
      <div className="bg-[#1A1A1A] px-3.5 pt-2.5 pb-3">
        <p className="text-sm font-bold tracking-[-0.01em] text-white leading-snug truncate">
          {category.title}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-[11px] text-white/55 truncate">
            {category.pool_size} {noun} {'·'} {(category.play_count || 0).toLocaleString()} plays
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] font-bold shrink-0"
            style={{ background: 'rgba(242,192,55,0.18)', color: '#F2C037' }}
          >
            {STAR_ICON} +30
          </span>
        </div>
      </div>
    </Link>
  );
}
