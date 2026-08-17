'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';

import { QuizCard } from '@/components/ui/quiz-card';
import { QuizCardHover } from '@/components/quiz/quiz-card-hover';
import { buildTeaser } from '@/lib/quiz/teaser';
import { GroupLogo } from '@/components/ui/group-logo';
import { CreateCTA } from '@/components/home/create-cta';
import { Mascot } from '@/components/ui/mascot';
import { languageLabel } from '@/lib/languages';
import { BrowseGroupSelect } from './browse-group-select';

import type { QuizCardData } from '@/lib/db/types';

export interface BrowseGroup {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  display_color: string;
  text_color: string;
}

export type SortKey = 'all' | 'trending' | 'newest' | 'most_played' | 'top_rated';
export type TypeKey = 'classic' | 'image' | 'intruder' | 'tf' | 'clue';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'newest', label: 'Newest' },
  { key: 'most_played', label: 'Most played' },
  { key: 'top_rated', label: 'Top rated' },
];
const DEFAULT_SORT: SortKey = 'all';

const TYPES: { key: TypeKey; label: string }[] = [
  { key: 'classic', label: 'Classic' },
  { key: 'image', label: 'Image' },
  { key: 'intruder', label: 'Intruder' },
  { key: 'tf', label: 'True/False' },
  { key: 'clue', label: 'Clues' },
];

const PAGE_SIZE = 48;
const CTA_EVERY = 14; // a Create banner every 14 cards (≈ every 7 desktop rows)
const SEARCH_MIN = 2;

/** Browse sort key → the existing /api/quizzes `tab` contract. */
function sortToTab(s: SortKey): string {
  switch (s) {
    case 'newest': return 'new';
    case 'most_played': return 'all';
    case 'top_rated': return 'top_rated';
    case 'trending': return 'trending';
    case 'all':
    default: return 'all';
  }
}

function typeToDb(t: TypeKey): string {
  switch (t) {
    case 'classic': return 'multiple_choice';
    case 'image': return 'image';
    case 'intruder': return 'intruder';
    case 'tf': return 'true_false';
    case 'clue': return 'guess_from_clues';
  }
}

function comboKey(sort: SortKey, group: string | null, type: TypeKey | null, language: string | null): string {
  return `${sort}:${group ?? ''}:${type ?? ''}:${language ?? ''}`;
}

/** Interleave a Create banner after every CTA_EVERY cards. */
function withBanners(quizzes: QuizCardData[]): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  quizzes.forEach((quiz, i) => {
    const teaser = buildTeaser(quiz);
    items.push(
      teaser
        ? <QuizCardHover key={quiz.id} teaser={teaser}><QuizCard quiz={quiz} index={i} /></QuizCardHover>
        : <QuizCard key={quiz.id} quiz={quiz} index={i} />,
    );
    if ((i + 1) % CTA_EVERY === 0 && i + 1 < quizzes.length) {
      items.push(
        <div className="grid-full" key={`cta-${i}`}>
          <CreateCTA />
        </div>,
      );
    }
  });
  return items;
}

interface Props {
  initialQuizzes: QuizCardData[];
  groups: BrowseGroup[];
  /** Q-B2: published-quiz counts per language (only languages that exist). */
  languageCounts: { language: string; count: number }[];
  initialGroup: string | null;
  initialType: TypeKey | null;
  initialLanguage: string | null;
  initialSort: SortKey;
}

/**
 * Client browse experience for /quizzes. The initial grid is server-rendered
 * (crawlable <a href> cards) and passed in via `initialQuizzes`; filter changes
 * fetch /api/quizzes client-side and update the URL shallowly (no server
 * round-trip) so ?group=bts is shareable/crawlable without a full reload.
 * A native search box queries /api/quizzes/search and overrides the grid.
 */
export function BrowseQuizzes({
  initialQuizzes,
  groups,
  languageCounts,
  initialGroup,
  initialType,
  initialLanguage,
  initialSort,
}: Props): React.ReactElement {
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [type, setType] = useState<TypeKey | null>(initialType);
  const [language, setLanguage] = useState<string | null>(initialLanguage);

  // Only offer the language filter when more than one language actually exists.
  const showLanguageFilter = languageCounts.length > 1;

  const initCK = comboKey(initialSort, initialGroup, initialType, initialLanguage);
  const [cache, setCache] = useState<Record<string, QuizCardData[]>>({ [initCK]: initialQuizzes });
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({
    [initCK]: initialQuizzes.length >= PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuizCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupBySlug = useRef(new Map(groups.map((g) => [g.slug, g])));
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const currentCK = comboKey(sort, group, type, language);
  const filteredQuizzes = cache[currentCK] ?? [];
  const isSearchActive = query.trim().length >= SEARCH_MIN;

  const buildApiUrl = useCallback(
    (s: SortKey, g: string | null, t: TypeKey | null, l: string | null, offset: number): string => {
      const params = new URLSearchParams({
        tab: sortToTab(s),
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      const gid = g ? groupBySlug.current.get(g)?.id : undefined;
      if (gid != null) params.set('group_id', String(gid));
      if (t) params.set('quiz_type', typeToDb(t));
      if (l) params.set('language', l);
      return `/api/quizzes?${params.toString()}`;
    },
    [],
  );

  /** Shallow URL update - keeps ?group/?type/?lang/?sort in sync, no server reload. */
  const syncUrl = useCallback((s: SortKey, g: string | null, t: TypeKey | null, l: string | null) => {
    const params = new URLSearchParams();
    if (g) params.set('group', g);
    if (t) params.set('type', t);
    if (l) params.set('lang', l);
    if (s !== DEFAULT_SORT) params.set('sort', s);
    const qs = params.toString();
    window.history.pushState(null, '', qs ? `/quizzes?${qs}` : '/quizzes');
  }, []);

  /** Fetch a filter combo's first page if we don't already have it cached. */
  const ensureLoaded = useCallback(
    (s: SortKey, g: string | null, t: TypeKey | null, l: string | null) => {
      const key = comboKey(s, g, t, l);
      if (cacheRef.current[key] !== undefined) return;
      setLoading(true);
      (async () => {
        try {
          const res = await fetch(buildApiUrl(s, g, t, l, 0));
          if (!res.ok) throw new Error('Failed to load quizzes');
          const data: { quizzes: QuizCardData[] } = await res.json();
          setCache((prev) => ({ ...prev, [key]: data.quizzes }));
          setHasMore((prev) => ({ ...prev, [key]: data.quizzes.length >= PAGE_SIZE }));
        } catch {
          setCache((prev) => ({ ...prev, [key]: [] }));
        } finally {
          setLoading(false);
        }
      })();
    },
    [buildApiUrl],
  );

  const apply = useCallback(
    (next: { sort?: SortKey; group?: string | null; type?: TypeKey | null; language?: string | null }) => {
      const s = next.sort ?? sort;
      const g = next.group !== undefined ? next.group : group;
      const t = next.type !== undefined ? next.type : type;
      const l = next.language !== undefined ? next.language : language;
      setSort(s);
      setGroup(g);
      setType(t);
      setLanguage(l);
      syncUrl(s, g, t, l);
      ensureLoaded(s, g, t, l);
    },
    [sort, group, type, language, syncUrl, ensureLoaded],
  );

  // Back/forward navigation: re-derive filters from the URL.
  useEffect(() => {
    function onPop(): void {
      const sp = new URLSearchParams(window.location.search);
      const g = sp.get('group');
      const tRaw = sp.get('type');
      const lRaw = sp.get('lang');
      const sRaw = sp.get('sort');
      const t = TYPES.some((x) => x.key === tRaw) ? (tRaw as TypeKey) : null;
      const l = lRaw && languageCounts.some((x) => x.language === lRaw) ? lRaw : null;
      const s = SORTS.some((x) => x.key === sRaw) ? (sRaw as SortKey) : DEFAULT_SORT;
      setSort(s);
      setGroup(g);
      setType(t);
      setLanguage(l);
      ensureLoaded(s, g, t, l);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [ensureLoaded, languageCounts]);

  // Debounced search.
  const onSearchChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < SEARCH_MIN) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quizzes/search?q=${encodeURIComponent(value.trim())}`);
        if (!res.ok) throw new Error('Search failed');
        const data: { quizzes: QuizCardData[] } = await res.json();
        setResults(data.quizzes);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setSearching(false);
  }, []);

  const loadMore = useCallback(async () => {
    const current = cacheRef.current[currentCK] ?? [];
    setLoadingMore(true);
    try {
      const res = await fetch(buildApiUrl(sort, group, type, language, current.length));
      if (!res.ok) throw new Error('Failed to load more');
      const data: { quizzes: QuizCardData[] } = await res.json();
      const seen = new Set(current.map((q) => q.id));
      const fresh = data.quizzes.filter((q) => !seen.has(q.id));
      setCache((prev) => ({ ...prev, [currentCK]: [...current, ...fresh] }));
      setHasMore((prev) => ({ ...prev, [currentCK]: data.quizzes.length >= PAGE_SIZE }));
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }, [currentCK, buildApiUrl, sort, group, type, language]);

  const displayed = isSearchActive ? (results ?? []) : filteredQuizzes;
  const canLoadMore = !isSearchActive && (hasMore[currentCK] ?? false);
  const activeGroupName = group ? groupBySlug.current.get(group)?.name ?? null : null;
  const showSkeleton = (isSearchActive ? searching : loading) && displayed.length === 0;

  return (
    <>
      {/* §3 - quiz search */}
      <div className="browse-search">
        <span className="search-ico" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search quizzes by title or group…"
          aria-label="Search quizzes"
          enterKeyHint="search"
        />
        {query.length > 0 && (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* §3b - sticky filter bar (hidden while searching). Mobile: chip
          scrollers. Desktop (U-5): searchable group dropdown + native selects. */}
      {!isSearchActive && (
        <div className="filter-bar-desktop" role="group" aria-label="Filter quizzes">
          <label className="fbd-field">
            <span className="fbd-label">Group</span>
            <BrowseGroupSelect groups={groups} value={group} onChange={(slug) => apply({ group: slug })} />
          </label>
          <label className="fbd-field">
            <span className="fbd-label">Type</span>
            <div className="fbd-select-wrap">
              <select
                className="fbd-select"
                value={type ?? ''}
                onChange={(e) => apply({ type: (e.target.value || null) as TypeKey | null })}
              >
                <option value="">All types</option>
                {TYPES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
              </select>
              <svg className="fbd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </label>
          <label className="fbd-field">
            <span className="fbd-label">Sort</span>
            <div className="fbd-select-wrap">
              <select
                className="fbd-select"
                value={sort}
                onChange={(e) => apply({ sort: e.target.value as SortKey })}
              >
                {SORTS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
              </select>
              <svg className="fbd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </label>
          {showLanguageFilter && (
            <label className="fbd-field">
              <span className="fbd-label">Language</span>
              <div className="fbd-select-wrap">
                <select
                  className="fbd-select"
                  value={language ?? ''}
                  onChange={(e) => apply({ language: e.target.value || null })}
                >
                  <option value="">All languages</option>
                  {languageCounts.map((lc) => (<option key={lc.language} value={lc.language}>{languageLabel(lc.language)} ({lc.count})</option>))}
                </select>
                <svg className="fbd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </label>
          )}
        </div>
      )}

      {!isSearchActive && (
        <div className="filter-bar filter-bar-mobile">
          {/* Row 1 - group pills */}
          <div className="group-pills" role="group" aria-label="Filter by group">
            <button
              type="button"
              className={`group-pill${group === null ? ' active' : ''}`}
              aria-pressed={group === null}
              onClick={() => apply({ group: null })}
            >
              All
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`group-pill${group === g.slug ? ' active' : ''}`}
                aria-pressed={group === g.slug}
                onClick={() => apply({ group: g.slug })}
              >
                <GroupLogo
                  groupName={g.name}
                  logoUrl={g.logo_url}
                  displayColor={g.display_color}
                  textColor={g.text_color}
                  size={18}
                />
                {g.name}
              </button>
            ))}
          </div>

          {/* Row 2 - type filter + sort */}
          <div className="type-sort-row" role="group" aria-label="Filter by type and sort order">
            <button
              type="button"
              className={`btn-filter${type === null ? ' active' : ''}`}
              aria-pressed={type === null}
              onClick={() => apply({ type: null })}
            >
              All types
            </button>
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`btn-filter${type === t.key ? ' active' : ''}`}
                aria-pressed={type === t.key}
                onClick={() => apply({ type: type === t.key ? null : t.key })}
              >
                {t.label}
              </button>
            ))}

            <span className="filter-divider" aria-hidden="true" />
            <span className="filter-group-label">Sort</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`btn-filter${sort === s.key ? ' active' : ''}`}
                aria-pressed={sort === s.key}
                onClick={() => apply({ sort: s.key })}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Row 3 - language filter (only when more than one language exists) */}
          {showLanguageFilter && (
            <div className="type-sort-row" role="group" aria-label="Filter by language">
              <span className="filter-group-label">Language</span>
              <button
                type="button"
                className={`btn-filter${language === null ? ' active' : ''}`}
                aria-pressed={language === null}
                onClick={() => apply({ language: null })}
              >
                All
              </button>
              {languageCounts.map((lc) => (
                <button
                  key={lc.language}
                  type="button"
                  className={`btn-filter${language === lc.language ? ' active' : ''}`}
                  aria-pressed={language === lc.language}
                  onClick={() => apply({ language: language === lc.language ? null : lc.language })}
                >
                  {languageLabel(lc.language)} ({lc.count})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* S2 #3: popular-window link mesh, under the filters */}
      {!isSearchActive && (
        <div className="browse-popular-row">
          <span className="browse-popular-label">Popular</span>
          <Link href="/quizzes/popular-today">today</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/quizzes/popular-this-week">this week</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/quizzes/popular-this-month">this month</Link>
        </div>
      )}

      {/* W7c - /trending, /new and /most-liked are browse views of this same catalogue,
          and nothing on the site linked them: the top nav lists them only as `match`
          patterns to highlight Home, which is a highlight rule, not a link. They belong
          beside the popular windows, so they live here rather than in a footer. */}
      {!isSearchActive && (
        <div className="browse-popular-row">
          <span className="browse-popular-label">Browse</span>
          <Link href="/trending">trending</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/new">newest</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/most-liked">most liked</Link>
        </div>
      )}

      {/* Search result count */}
      {isSearchActive && !searching && results !== null && (
        <p className="search-count">
          {results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”
        </p>
      )}

      {/* Grid / skeleton / empty */}
      {showSkeleton ? (
        <div className="cards-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton-card" key={i}>
              <div className="skel skel-cover" />
              <div className="skel-body">
                <div className="skel skel-line w40" style={{ height: 8 }} />
                <div className="skel skel-line w80" />
                <div className="skel skel-line w60" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Mascot variant="sad" size={88} />
          </div>
          <p className="empty-title">No quizzes found</p>
          <p className="empty-desc">
            {isSearchActive
              ? `Nothing matches “${query.trim()}”. Try another search.`
              : `No ${activeGroupName ?? 'matching'} quizzes yet. Be the first to create one.`}
          </p>
          <Link href="/create" className="btn-primary">
            Create a quiz
          </Link>
        </div>
      ) : (
        <div className="cards-grid">{withBanners(displayed)}</div>
      )}

      {/* §3e - load more (filtered grid only) */}
      {canLoadMore && displayed.length > 0 && (
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <button type="button" className="btn-outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more quizzes'}
          </button>
        </div>
      )}
    </>
  );
}
