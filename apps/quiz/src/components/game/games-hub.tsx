'use client';

import { useState } from 'react';
import Link from 'next/link';

import { toNameAllGame } from '@/components/games/adapters';

import type { GameCardData } from '@/lib/db/types';

interface TotCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: 'idol' | 'group' | 'song';
  pool_size: number;
  play_count: number;
  tot_items?: { name: string; image_url: string | null }[];
}

/** First item image from a list, for the card preview thumbnail. */
function previewImage(items?: { image_url?: string | null }[]): string | null {
  return items?.find((it) => it.image_url)?.image_url ?? null;
}

interface GamesHubProps {
  nameAllGames: GameCardData[];
  totCategories: TotCategory[];
}

// §2e canonical group order for the filter pills.
const GROUP_ORDER = [
  'bts', 'blackpink', 'stray-kids', 'twice', 'aespa', 'seventeen',
  'newjeans', 'exo', 'ive', 'enhypen', 'txt', 'le-sserafim',
];

function initial(name: string): string {
  if (!name) return '?';
  return name.replace(/[()]/g, '').trim().charAt(0).toUpperCase();
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function totNoun(type: TotCategory['type']): string {
  return type === 'song' ? 'songs' : type === 'group' ? 'groups' : 'idols';
}

// Category slug -> the new duel matchup (group + question_type).
const DUEL_GROUP_PREFIXES = ['stray-kids', 'blackpink', 'seventeen', 'aespa', 'bts'];
function totDuelHref(slug: string): string {
  const g = DUEL_GROUP_PREFIXES.find((p) => slug.startsWith(`${p}-`));
  const group = g ?? 'general';
  const type = g ? slug.slice(g.length + 1) : slug;
  return `/games/this-or-that?group=${encodeURIComponent(group)}&type=${encodeURIComponent(type)}`;
}

const PLAY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const USER_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const CLOCK_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export function GamesHub({ nameAllGames, totCategories }: GamesHubProps): React.ReactElement {
  const [group, setGroup] = useState<string>('all');

  // Derive filter pills from the groups actually present in the name-all games.
  const present = new Map<string, string>();
  for (const g of nameAllGames) {
    if (g.group_slug && g.group_name) present.set(g.group_slug, g.group_name);
  }
  const orderedSlugs = [
    ...GROUP_ORDER.filter((s) => present.has(s)),
    ...[...present.keys()].filter((s) => !GROUP_ORDER.includes(s)),
  ];
  const pills = [{ slug: 'all', label: 'All' }, ...orderedSlugs.map((s) => ({ slug: s, label: present.get(s)! }))];

  // This-or-That categories are cross-group, so they only show under "All".
  const totVisible = group === 'all' ? totCategories : [];
  const namVisible = group === 'all' ? nameAllGames : nameAllGames.filter((g) => g.group_slug === group);

  const showDivider = totVisible.length > 0 && namVisible.length > 0;

  return (
    <main className="games-page">
      {/* §13b - hero */}
      <div className="games-hero">
        <p className="games-eyebrow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><rect x="2" y="6" width="20" height="12" rx="2" />
          </svg>
          Games
        </p>
        <h1 className="games-title">Pick. Type. <span>Win.</span></h1>
        <p className="games-sub">Two game modes, hundreds of challenges. How fast can you name all members? Who is your ultimate bias?</p>
      </div>

      {/* §13b - mode hero cards */}
      <div className="mode-grid">
        <Link href="/games/this-or-that" className="mode-card tot" style={{ animationDelay: '0ms', textDecoration: 'none' }}>
          <span className="mode-badge badge-hot">Most played</span>
          <div className="mode-deco" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
          </div>
          <p className="mode-name">This or That</p>
          <p className="mode-desc">Two options. One winner. Pick your bias in infinite head-to-head matchups across idols, songs, and groups.</p>
          <div className="mode-meta">
            <span className="mode-stat">{USER_ICON} {totCategories.length || '20'}+ categories</span>
            <span className="mode-stat">{CLOCK_ICON} ~3 min</span>
          </div>
          <span className="mode-play">{PLAY_ICON} Play now</span>
        </Link>

        <Link href="/games/name-all" className="mode-card nam" style={{ animationDelay: '60ms', textDecoration: 'none' }}>
          <span className="mode-badge badge-new">{pills.length - 1 || '24'}+ groups</span>
          <div className="mode-deco" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
          </div>
          <p className="mode-name">Name all members</p>
          <p className="mode-desc">Type every member&apos;s name before the timer runs out. Sounds easy. It never is.</p>
          <div className="mode-meta">
            <span className="mode-stat">{USER_ICON} {nameAllGames.length || '24'}+ challenges</span>
            <span className="mode-stat">{CLOCK_ICON} 0:30 to 5:00</span>
          </div>
          <span className="mode-play">{PLAY_ICON} Play now</span>
        </Link>
      </div>

      {/* Discovery into the fan-vote rankings (Pipeline 1, C9). */}
      <div className="games-rankings-cta">
        <Link href="/rankings">See the live fan rankings &rarr;</Link>
      </div>

      {/* §13b - filter bar (filters both sections) */}
      <div className="games-filter-row" role="group" aria-label="Filter games by group">
        <span className="filter-label">Filter</span>
        {pills.map((p) => (
          <button
            key={p.slug}
            type="button"
            className={`fpill${group === p.slug ? ' active' : ''}`}
            aria-pressed={group === p.slug}
            onClick={() => setGroup(p.slug)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* This or That section */}
      {totVisible.length > 0 && (
        <>
          <div className="games-sec-head">
            <span className="games-sec-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
              This or That
            </span>
            <Link href="/games/this-or-that" className="games-sec-see">See all {totCategories.length}+ →</Link>
          </div>
          <div className="game-grid">
            {totVisible.map((c, i) => {
              const prev = previewImage(c.tot_items);
              return (
                <Link key={c.id} href={totDuelHref(c.slug)} className="game-card" style={{ animationDelay: `${i * 40}ms`, textDecoration: 'none' }}>
                  <div className={`gc-icon gc-tot${prev ? ' has-img' : ''}`} aria-hidden="true">
                    {prev ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prev} alt="" loading="lazy" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
                    )}
                  </div>
                  <div className="gc-body">
                    <p className="gc-name">{c.title}</p>
                    <p className="gc-sub">{c.pool_size} {totNoun(c.type)}{c.subtitle ? ` · ${c.subtitle}` : ''}</p>
                    <div className="gc-footer">
                      <span className="gc-plays">{USER_ICON} {(c.play_count || 0).toLocaleString()} plays</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {showDivider && <div className="games-divider" />}

      {/* Name all members section */}
      {namVisible.length > 0 && (
        <>
          <div className="games-sec-head">
            <span className="games-sec-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
              Name all members
            </span>
            <Link href="/games/name-all" className="games-sec-see">See all {nameAllGames.length}+ →</Link>
          </div>
          <div className="game-grid">
            {namVisible.map((g, i) => {
              const na = toNameAllGame(g);
              const inits = na.data.items.slice(0, 8).map((it) => initial(it.name));
              const extra = na.data.items.length - inits.length;
              const diffCls = na.difficulty === 'easy' ? 'd-easy' : na.difficulty === 'hard' ? 'd-hard' : 'd-med';
              const prev = previewImage(na.data.items);
              return (
                <Link key={g.id} href={`/games/name-all/${g.slug}`} className="game-card" style={{ animationDelay: `${i * 40}ms`, textDecoration: 'none' }}>
                  <div className={`gc-icon gc-nam${prev ? ' has-img' : ''}`} aria-hidden="true">
                    {prev ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prev} alt="" loading="lazy" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
                    )}
                  </div>
                  <div className="gc-body">
                    <div className="nam-hints">
                      {inits.map((c, j) => (
                        <div className="hint-dot" key={j}>{c}</div>
                      ))}
                      {extra > 0 && <div className="hint-dot">+{extra}</div>}
                    </div>
                    <p className="gc-name">{na.title}</p>
                    <div className="gc-footer">
                      <span className={`diff-pill ${diffCls}`}>{na.difficulty.charAt(0).toUpperCase() + na.difficulty.slice(1)}</span>
                      <span className="timer-pill">{CLOCK_ICON} {formatTimer(na.timer_seconds)}</span>
                      <span className="gc-plays">{USER_ICON} {(na.play_count || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
