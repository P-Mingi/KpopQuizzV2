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

function getGradient(color: string | null, fallback: string) {
  const base = color || fallback;
  return `linear-gradient(135deg, ${lighten(base, 15)} 0%, ${base} 100%)`;
}

function lighten(hex: string, amount: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function TotCategoryCard({ category }: { category: TotCategory }) {
  const items = category.tot_items || [];
  const left = items[0];
  const right = items[1] || items[Math.min(1, items.length - 1)];

  const typeLabel =
    category.type === 'idol' ? 'Idols' : category.type === 'group' ? 'Groups' : 'Songs';

  const typeBg =
    category.type === 'idol'
      ? 'rgba(212,83,126,0.85)'
      : category.type === 'group'
      ? 'rgba(127,119,221,0.85)'
      : 'rgba(239,159,39,0.85)';

  const leftFallback = '#1a3f7a';
  const rightFallback = '#0a4a36';

  return (
    <Link
      href={`/games/this-or-that/${category.slug}`}
      className="flex-shrink-0 w-[200px] rounded-2xl overflow-hidden border-[1.5px] border-[#2a2a2a] bg-[#0C0C0E] cursor-pointer hover:-translate-y-[3px] hover:border-[#D4537E] transition-all"
    >
      {/* Banner — 180px tall with two skewed halves */}
      <div className="h-[180px] relative flex overflow-hidden">
        {/* Left half — skewed 8 degrees */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            transform: 'skewX(-8deg)',
            transformOrigin: 'top left',
            marginLeft: '-10px',
            width: 'calc(50% + 10px)',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center text-white/95 font-medium"
            style={{
              transform: 'skewX(8deg)',
              background: left?.image_url ? undefined : getGradient(left?.color || null, leftFallback),
              fontSize: left?.name && left.name.length <= 3 ? '46px' : '36px',
              letterSpacing: '-1px',
            }}
          >
            {left?.image_url ? (
              <img
                src={left.image_url}
                alt={left.name}
                className="w-full h-full object-cover"
                style={{ transform: 'skewX(8deg) scale(1.15)' }}
              />
            ) : (
              getInitials(left?.name || '?')
            )}
          </div>
        </div>

        {/* Right half — skewed 8 degrees */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            transform: 'skewX(-8deg)',
            transformOrigin: 'top left',
            marginRight: '-10px',
            width: 'calc(50% + 10px)',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center text-white/95 font-medium"
            style={{
              transform: 'skewX(8deg)',
              background: right?.image_url ? undefined : getGradient(right?.color || null, rightFallback),
              fontSize: right?.name && right.name.length <= 3 ? '46px' : '36px',
              letterSpacing: '-1px',
            }}
          >
            {right?.image_url ? (
              <img
                src={right.image_url}
                alt={right.name}
                className="w-full h-full object-cover"
                style={{ transform: 'skewX(8deg) scale(1.15)' }}
              />
            ) : (
              getInitials(right?.name || '?')
            )}
          </div>
        </div>

        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[60%] z-[4] pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          }}
        />

        {/* VS badge — center, 42px with double ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[8] w-[42px] h-[42px] rounded-full bg-[#0C0C0E] border-2 border-white/20 flex items-center justify-center text-[13px] font-medium text-white tracking-wider">
          VS
          <div className="absolute -inset-[5px] rounded-full border border-white/[0.08]" />
        </div>

        {/* Type badge — top right */}
        <span
          className="absolute top-2 right-2 px-2 py-[3px] rounded-md text-[9px] font-medium text-white z-[7]"
          style={{ background: typeBg, backdropFilter: 'blur(8px)' }}
        >
          {typeLabel}
        </span>

        {/* Left name — bottom left */}
        {left?.name && (
          <span className="absolute bottom-2 left-2.5 z-[5] text-[10px] font-medium text-white/85 tracking-[0.3px] max-w-[70px] truncate">
            {left.name}
          </span>
        )}

        {/* Right name — bottom right */}
        {right?.name && (
          <span className="absolute bottom-2 right-2.5 z-[5] text-[10px] font-medium text-white/85 tracking-[0.3px] max-w-[70px] truncate">
            {right.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 pb-3">
        <p className="text-[13px] font-medium text-white leading-tight mb-[3px]">
          {category.title}
        </p>
        <p className="text-[10px] text-white/40">
          {category.pool_size} {category.type === 'song' ? 'songs' : category.type === 'group' ? 'groups' : 'idols'}
          {' / '}
          {(category.play_count || 0).toLocaleString()} plays
        </p>
      </div>
    </Link>
  );
}
