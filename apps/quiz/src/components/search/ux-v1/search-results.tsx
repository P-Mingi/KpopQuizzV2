'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';
import { photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { flatRows, normalizeQuery, resultSummary } from '@/lib/ux-v1/p11/search-model';

import type { P11SearchResult } from '@/lib/ux-v1/p11/search-model';

// P11 search overlay results (DESIGN-SPEC 16.5 + 17.1, prototype searchFilter(),
// state `search`). Rendered by A0's overlay host (components/layout/ux-v1/ux-search.tsx)
// through the SearchResults slot, with exactly the slot props. Before typing: Popular
// groups + Most played quizzes; while typing: Groups, Quizzes (incl. the quizzes of a
// matched group), Songs in the blindtest, or a real no-results state. Enter opens the
// highlighted (first) row (WIRING-MAP v10 "Enter opens first", prototype keydown);
// ArrowDown moves into the list, arrows move between rows, ArrowUp on the first row
// goes back to the field. Data: GET /api/ux-v1/p11/search (public catalog, read only).

export interface SearchResultsProps {
  /** The live query (trimmed). */
  query: string;
  /** Call before navigating so the overlay closes. */
  onNavigate: () => void;
}

type Payload = P11SearchResult & { degraded?: boolean };

const DEBOUNCE_MS = 140;
const POPULAR_TTL_MS = 10 * 60_000;
const INPUT_ID = 'ux-sq'; // A0's overlay field

// Session caches: reopening the overlay or retyping a query shows its rows at once.
let popularCache: { at: number; data: Payload } | null = null;
const queryCache = new Map<string, Payload>();
function remember(q: string, data: Payload): void {
  if (data.degraded) return;
  queryCache.set(q, data);
  if (queryCache.size > 40) queryCache.delete(queryCache.keys().next().value as string);
}

async function load(q: string, signal: AbortSignal): Promise<Payload | null> {
  try {
    const res = await fetch(q ? `/api/ux-v1/p11/search?q=${encodeURIComponent(q)}` : '/api/ux-v1/p11/search', { signal });
    if (!res.ok) return null;
    return (await res.json()) as Payload;
  } catch {
    return null;
  }
}

function plainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function Thumb({ src, initials, square, seed }: { src: string | null; initials: string; square?: boolean; seed: string }): React.ReactElement {
  const cls = ['ux-srow-th', 'p11-sth', square ? 'is-sq' : '', src ? '' : 'is-ini'].filter(Boolean).join(' ');
  return (
    <span className={cls} aria-hidden="true">
      {src
        ? <Image src={src} alt="" width={36} height={36} sizes="36px" style={{ objectPosition: src.startsWith('/idols/') ? photoFocal(seed) : 'center 25%' }} />
        : initials}
    </span>
  );
}

export function SearchResults({ query, onNavigate }: SearchResultsProps): React.ReactElement {
  const q = normalizeQuery(query);
  const router = useRouter();
  const uid = useId().replace(/:/g, '');
  const [popular, setPopular] = useState<Payload | null>(() => popularCache?.data ?? null);
  const [found, setFound] = useState<Payload | null>(() => (q ? queryCache.get(q) ?? null : null));
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [act, setAct] = useState({ key: '', i: 0 });
  const box = useRef<HTMLDivElement>(null);

  // The popular lists (once per session, refreshed after 10 minutes).
  useEffect(() => {
    if (popularCache && Date.now() - popularCache.at < POPULAR_TTL_MS) return;
    const ac = new AbortController();
    void load('', ac.signal).then((d) => {
      if (!d || ac.signal.aborted) return;
      if (!d.degraded) popularCache = { at: Date.now(), data: d };
      setPopular(d);
    });
    return () => ac.abort();
  }, []);

  // The query (debounced; a newer query aborts the older request).
  useEffect(() => {
    if (!q) return;
    const hit = queryCache.get(q);
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      if (hit) { setFound(hit); setFailedFor(null); return; }
      void load(q, ac.signal).then((d) => {
        if (ac.signal.aborted) return;
        if (!d || (d.degraded && d.groups.length + d.quizzes.length + d.songs.length === 0)) { setFailedFor(q); return; }
        remember(q, d);
        setFound(d);
        setFailedFor(null);
      });
    }, hit ? 0 : DEBOUNCE_MS);
    return () => { window.clearTimeout(t); ac.abort(); };
  }, [q]);

  // On screen: the popular lists before typing, else the latest answer (the
  // previous one stays, marked busy, while the next loads: no flicker).
  const failed = q !== '' && failedFor === q;
  const shown: Payload | null = failed ? null : q ? found : popular;
  const current = Boolean(shown && shown.q === q);
  const rows = shown ? flatRows(shown) : [];
  const key = shown ? `${shown.q}|${rows.length}` : '';
  const activeIdx = rows.length ? Math.min(act.key === key ? act.i : 0, rows.length - 1) : -1;

  const go = useCallback((href: string) => {
    onNavigate();
    router.push(href);
  }, [onNavigate, router]);

  // Keys typed in A0's field. Enter opens the highlighted row (with no row, or rows
  // of an older query, Enter is left to the host: it opens the full /search page).
  const latest = useRef({ rows, activeIdx, current });
  useEffect(() => { latest.current = { rows, activeIdx, current }; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (!target || target.id !== INPUT_ID || e.isComposing || e.keyCode === 229) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const s = latest.current;
      if (e.key === 'Enter') {
        const row = s.current && s.activeIdx >= 0 ? s.rows[s.activeIdx] : undefined;
        if (!row) return;
        e.preventDefault();
        go(row.href);
      } else if (e.key === 'ArrowDown' && s.rows.length) {
        e.preventDefault();
        box.current?.querySelectorAll<HTMLElement>('.ux-srow')[Math.max(0, s.activeIdx)]?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [go]);

  const onListKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const links = Array.from(box.current?.querySelectorAll<HTMLElement>('.ux-srow') ?? []);
    const i = links.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1 : e.key === 'ArrowDown' ? Math.min(links.length - 1, i + 1) : i - 1;
    if (n < 0) { setAct({ key, i: 0 }); document.getElementById(INPUT_ID)?.focus(); return; }
    setAct({ key, i: n });
    links[n]?.focus();
  };

  if (failed) {
    return <p className="ux-sov-hint p11-shint" role="status" data-p11="search">Search is not available right now. Press Enter to open the search page.</p>;
  }
  if (!shown) return <div className="p11-sres" aria-busy="true" data-p11="search" />;

  const popularMode = shown.mode === 'popular';
  const empty = rows.length === 0;
  // Rows are numbered in display order (groups, then quizzes, then songs): the keyboard order.
  const qBase = shown.groups.length;
  const sBase = qBase + shown.quizzes.length;
  const row = (href: string, idx: number): { className: string; href: string; onClick: (e: React.MouseEvent) => void; onMouseEnter: () => void; onFocus: () => void } => {
    return {
      className: `ux-srow${idx === activeIdx ? ' is-active' : ''}`,
      href,
      onClick: (e) => { if (plainClick(e)) onNavigate(); },
      onMouseEnter: () => setAct({ key, i: idx }),
      onFocus: () => setAct({ key, i: idx }),
    };
  };

  return (
    <div className="p11-sres" ref={box} onKeyDown={onListKey} aria-busy={(q !== '' && !current) || undefined} data-p11="search">
      <p className="ux-sr" role="status" aria-live="polite">{current && !popularMode ? resultSummary(shown) : ''}</p>
      {shown.degraded && !popularMode && !empty ? <p className="ux-sov-hint p11-shint">Some results could not be loaded.</p> : null}
      {empty && !popularMode ? (
        <div className="ux-empty p11-sempty">
          <b>No results for &quot;{shown.q}&quot;</b>
          Try a group name, like Stray Kids, or a song title.
        </div>
      ) : null}
      {shown.groups.length ? (
        <>
          <div className="ux-sov-l" id={`${uid}-g`}>{popularMode ? 'Popular groups' : 'Groups'}</div>
          <ul aria-labelledby={`${uid}-g`}>
            {shown.groups.map((g, gi) => (
              <li key={g.slug}>
                <Link {...row(g.href, gi)}>
                  <Thumb src={g.photo} initials={g.initials} seed={g.slug} />
                  <span className="p11-st">{g.name}</span>
                  <small>{g.sub}</small>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {shown.quizzes.length ? (
        <>
          <div className="ux-sov-l" id={`${uid}-q`}>{popularMode ? 'Most played quizzes' : 'Quizzes'}</div>
          <ul aria-labelledby={`${uid}-q`}>
            {shown.quizzes.map((x, qi) => (
              <li key={x.href}>
                <Link {...row(x.href, qBase + qi)}>
                  <Thumb src={x.thumb} initials={x.initials} square seed={x.title} />
                  <span className="p11-st">{x.title}</span>
                  <small>{x.sub}</small>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {shown.songs.length ? (
        <>
          <div className="ux-sov-l" id={`${uid}-s`}>Songs in the blindtest</div>
          <ul aria-labelledby={`${uid}-s`}>
            {shown.songs.map((s, k) => (
              <li key={`${s.title}|${s.sub}|${k}`}>
                <Link {...row(s.href, sBase + k)}>
                  <span className="ux-srow-th is-sq p11-song-th" aria-hidden="true"><Icon name="music" size="sm" /></span>
                  <span className="p11-st">{s.title}</span>
                  <small>{s.sub}</small>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
