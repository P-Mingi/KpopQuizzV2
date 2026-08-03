'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// V-PAGES step 6 - the Palworld-pattern index enhancer. The TRUTH IS IN THE
// HTML: the server renders the complete list; this client layer only hides DOM
// nodes (facet chips + search-within + a live "N matching · N total" counter +
// Reset). JS-off = the full list, untouched.
//
// Contract: every item carries data-deck-item plus data-f-{facet}="value"
// attributes and data-search="haystack". Chips are declared via the `facets`
// prop with LIVE counts computed from the server-rendered DOM at mount (so the
// chip numbers can never disagree with the list).

export function DeckFilter({ scopeId, facets, searchLabel = 'Search within this list' }: {
  scopeId: string;
  // sort 'value-desc' renders chips in reverse value order (a year facet walks
  // the timeline newest-first); default stays count-descending.
  facets: { key: string; label: string; sort?: 'count' | 'value-desc' }[];
  searchLabel?: string;
}): React.ReactElement | null {
  const [active, setActive] = useState<Record<string, string | null>>({});
  const [q, setQ] = useState('');
  const [counts, setCounts] = useState<{ total: number; matching: number }>({ total: 0, matching: 0 });
  const [chipData, setChipData] = useState<Record<string, { value: string; n: number }[]>>({});
  const itemsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) return;
    const items = [...scope.querySelectorAll<HTMLElement>('[data-deck-item]')];
    itemsRef.current = items;
    const byFacet: Record<string, Map<string, number>> = {};
    for (const f of facets) byFacet[f.key] = new Map();
    for (const it of items) {
      for (const f of facets) {
        const v = it.getAttribute(`data-f-${f.key}`);
        if (v) byFacet[f.key]!.set(v, (byFacet[f.key]!.get(v) ?? 0) + 1);
      }
    }
    setChipData(Object.fromEntries(facets.map((f) => [
      f.key,
      [...byFacet[f.key]!.entries()]
        .sort((a, b) => f.sort === 'value-desc' ? b[0].localeCompare(a[0]) : b[1] - a[1])
        .slice(0, 12).map(([value, n]) => ({ value, n })),
    ])));
    setCounts({ total: items.length, matching: items.length });
  }, [scopeId, facets]);

  useEffect(() => {
    const items = itemsRef.current;
    const needle = q.trim().toLowerCase();
    let matching = 0;
    for (const it of items) {
      let show = true;
      for (const [key, val] of Object.entries(active)) {
        if (val && it.getAttribute(`data-f-${key}`) !== val) { show = false; break; }
      }
      if (show && needle) {
        const hay = (it.getAttribute('data-search') ?? it.textContent ?? '').toLowerCase();
        if (!hay.includes(needle)) show = false;
      }
      it.style.display = show ? '' : 'none';
      if (show) matching++;
    }
    // Album-group containers hide when every row inside them is filtered out.
    const scope = document.getElementById(scopeId);
    if (scope) {
      for (const g of scope.querySelectorAll<HTMLElement>('[data-deck-group]')) {
        const anyVisible = [...g.querySelectorAll<HTMLElement>('[data-deck-item]')].some((el) => el.style.display !== 'none');
        g.style.display = anyVisible ? '' : 'none';
      }
    }
    setCounts((c) => ({ ...c, matching }));
  }, [active, q, scopeId]);

  const anyActive = useMemo(() => q.trim() !== '' || Object.values(active).some(Boolean), [q, active]);
  if (counts.total === 0) return null;

  return (
    <div className="v-module" role="group" aria-label="Filter this list">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel} aria-label={searchLabel}
          className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
        <span className="text-[12.5px] tabular-nums text-tertiary" aria-live="polite">
          {counts.matching === counts.total ? `${counts.total} total` : `${counts.matching} matching · ${counts.total} total`}
        </span>
        {anyActive ? (
          <button type="button" onClick={() => { setActive({}); setQ(''); }}
            className="inline-flex min-h-[44px] items-center text-[12.5px] font-bold text-tertiary hover:text-secondary">
            Reset
          </button>
        ) : null}
      </div>
      {facets.map((f) => {
        const chips = chipData[f.key] ?? [];
        if (chips.length < 2) return null;
        return (
          <div key={f.key} className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-tertiary">{f.label}</span>
            {chips.map((c) => {
              const on = active[f.key] === c.value;
              return (
                <button key={c.value} type="button" aria-pressed={on}
                  onClick={() => setActive((a) => ({ ...a, [f.key]: on ? null : c.value }))}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-[12.5px] font-semibold transition-colors"
                  style={on
                    ? { background: 'var(--verse-cta, var(--verse-accent))', borderColor: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, #fff)' }
                    : { borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>
                  {c.value}
                  <span className="tabular-nums" style={{ opacity: 0.75 }}>{c.n}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
