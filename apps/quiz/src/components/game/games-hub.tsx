'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { TotCategoryCard } from '@/components/games/tot-category-card';
import { NameAllGrid } from '@/components/games/name-all-grid';
import { toNameAllGame } from '@/components/games/adapters';

import type { GameCardData } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GamesHubProps {
  nameAllGames: GameCardData[];
  totCategories: any[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_PILLS = [
  { label: 'BTS', slug: 'bts' },
  { label: 'BLACKPINK', slug: 'blackpink' },
  { label: 'SEVENTEEN', slug: 'seventeen' },
  { label: 'Stray Kids', slug: 'stray-kids' },
  { label: 'aespa', slug: 'aespa' },
  { label: 'TWICE', slug: 'twice' },
  { label: 'NewJeans', slug: 'newjeans' },
  { label: 'IVE', slug: 'ive' },
  { label: 'EXO', slug: 'exo' },
  { label: 'ENHYPEN', slug: 'enhypen' },
  { label: 'TXT', slug: 'txt' },
  { label: 'LE SSERAFIM', slug: 'le-sserafim' },
];

// ---------------------------------------------------------------------------
// Featured hero cards
// ---------------------------------------------------------------------------

function FeaturedCards() {
  const featured = [
    {
      id: 'tot',
      href: '/games/this-or-that',
      kind: 'Tournament',
      title: 'This or That',
      tagline: 'Pick your bias in head-to-head idol matchups',
      sub: 'Multiple categories available',
      color: '#D4537E',
      reward: 50,
      dark: true,
    },
    {
      id: 'naa',
      href: '/games/name-all',
      kind: 'Memory',
      title: 'Name all members',
      tagline: 'Name every member before the timer runs out',
      sub: '20+ groups to challenge',
      color: '#7F77DD',
      reward: 80,
      dark: false,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12, marginBottom: 14 }}>
      {featured.map((d) => {
        const bg = d.dark
          ? `radial-gradient(120% 90% at 0% 0%, ${d.color}55 0%, transparent 50%), linear-gradient(160deg, #1F1F1F 0%, #0F0F0F 100%)`
          : `radial-gradient(120% 90% at 100% 0%, ${d.color}33 0%, transparent 55%), linear-gradient(160deg, color-mix(in srgb, ${d.color} 18%, #fff) 0%, color-mix(in srgb, ${d.color} 8%, #fff) 100%)`;
        const fg = d.dark ? '#fff' : '#1F1F1F';
        const tagBg = d.dark ? `${d.color}33` : `${d.color}22`;
        const tagFg = d.color;

        return (
          <Link
            key={d.id}
            href={d.href}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 18, padding: 18,
              border: `1px solid ${d.dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
              background: bg, color: fg,
              display: 'flex', flexDirection: 'column', gap: 12,
              minHeight: 180, textDecoration: 'none',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 32px -10px ${d.color}55`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {/* Sparkle ornament */}
            <div aria-hidden="true" style={{
              position: 'absolute', right: -20, top: -20, width: 140, height: 140,
              background: `radial-gradient(circle, ${d.color}55 0%, transparent 65%)`,
              filter: 'blur(8px)', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
              <span style={{
                padding: '4px 10px', borderRadius: 9999,
                background: tagBg, color: tagFg,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{d.kind}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 6 }}>{d.title}</div>
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5, marginBottom: 8 }}>{d.tagline}</div>
              <div style={{ fontSize: 11, opacity: 0.55 }}>{d.sub}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 9999,
                background: d.color, color: '#fff',
                fontSize: 13, fontWeight: 700,
              }}>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="#fff"><path d="M2 1l7 4-7 4z" /></svg>
                Play
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, color: '#F2C037',
              }}>
                <span style={{ fontSize: 12 }}>{'\u2B50'}</span> +{d.reward}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      <Link href={href} style={{
        background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        color: 'var(--accent)', fontSize: 12, fontWeight: 700, textDecoration: 'none',
      }}>See all {count}+</Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GamesHub({ nameAllGames, totCategories }: GamesHubProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const filteredTot = useMemo(() => {
    if (!search.trim()) return totCategories;
    const q = search.toLowerCase().trim();
    return totCategories.filter((cat: any) => cat.title.toLowerCase().includes(q));
  }, [totCategories, search]);

  const filteredNameAll = useMemo(() => {
    let list = [...nameAllGames];
    if (selectedGroup) list = list.filter((g) => g.group_slug === selectedGroup);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((g) =>
        g.title.toLowerCase().includes(q) || (g.group_name?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [nameAllGames, selectedGroup, search]);

  return (
    <div style={{ paddingTop: 12 }}>
      {/* 1. Featured hero cards */}
      <FeaturedCards />

      {/* 2. Search bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
        >
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games..."
          style={{
            width: '100%', padding: '12px 12px 12px 38px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12, fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      {/* 3. Group filter pills */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <div className="scrollbar-hide" style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 4, paddingRight: 32,
        }}>
          <button
            type="button"
            onClick={() => setSelectedGroup(null)}
            style={{
              flexShrink: 0,
              padding: '7px 14px', borderRadius: 9999,
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 160ms ease',
              background: selectedGroup === null ? 'var(--accent)' : 'transparent',
              color: selectedGroup === null ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${selectedGroup === null ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            All
          </button>
          {GROUP_PILLS.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setSelectedGroup(selectedGroup === g.slug ? null : g.slug)}
              style={{
                flexShrink: 0,
                padding: '7px 14px', borderRadius: 9999,
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 160ms ease',
                background: selectedGroup === g.slug ? 'var(--text-primary)' : 'transparent',
                color: selectedGroup === g.slug ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: `1px solid ${selectedGroup === g.slug ? 'var(--text-primary)' : 'var(--border)'}`,
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 4, width: 40,
          background: 'linear-gradient(90deg, transparent, var(--bg-primary))',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 4. This or That section */}
      {filteredTot.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <SectionHeader title="This or that" count={totCategories.length} href="/games/this-or-that" />
          <div style={{ position: 'relative' }}>
            <div className="scrollbar-hide" style={{
              display: 'flex', gap: 10, overflowX: 'auto',
              paddingBottom: 4, paddingRight: 24,
              scrollSnapType: 'x mandatory',
            }}>
              {filteredTot.map((cat: any) => (
                <TotCategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Name All Members section */}
      <section style={{ marginBottom: 22 }}>
        <SectionHeader title="Name all members" count={nameAllGames.length} href="/games/name-all" />
        {filteredNameAll.length > 0 ? (
          <NameAllGrid games={filteredNameAll.map(toNameAllGame)} />
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No games match your filters.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setSelectedGroup(null); }}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginTop: 8,
                fontFamily: 'inherit',
              }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
