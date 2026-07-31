'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Hit { type: string; label: string; sub: string; href: string; }

/** W3K.9 - site-wide Verse autocomplete. Reuses the entity search API (groups / idols /
 * albums). Keyboard: type to search, arrows to move, enter to open, escape to close. */
export function VerseSearch(): React.ReactElement {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // In-world search entries (nav, footer, 404) land here with ?search=1; the
  // box takes focus so the visitor types immediately.
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get('search') === '1') inputRef.current?.focus(); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setHits([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/verse/entities/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => { setHits(d.results ?? []); setOpen(true); setActive(0); })
        .catch(() => {});
    }, 160);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { const h = hits[active]; if (h) window.location.href = h.href; }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} onFocus={() => hits.length && setOpen(true)}
        placeholder="Search groups, members, albums" aria-label="Search Verse"
        className="w-full rounded-full border border-default bg-surface px-4 py-2.5 text-sm outline-none focus:border-strong"
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="verse-search-list"
        aria-activedescendant={open && active >= 0 ? `verse-search-opt-${active}` : undefined}
      />
      {open && hits.length > 0 ? (
        <ul id="verse-search-list" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-default bg-surface shadow-lg">
          {hits.map((h, i) => (
            <li key={h.href} id={`verse-search-opt-${i}`} role="option" aria-selected={i === active}>
              <Link href={h.href} onMouseEnter={() => setActive(i)} className={`flex items-center justify-between gap-3 px-4 py-2 text-sm no-underline ${i === active ? 'bg-surface-1' : ''}`}>
                <span className="font-semibold text-primary">{h.label}</span>
                <span className="text-xs text-tertiary">{h.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
