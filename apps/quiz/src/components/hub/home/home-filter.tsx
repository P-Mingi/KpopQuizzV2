'use client';

// Run O1, lot H2c: the filter of "Hot right now" (All, KpopQuiz, OtakuQuiz) is shared with the search button of the top bar, which
// leads to the search page of KpopQuiz on All and KpopQuiz and to the one of OtakuQuiz on OtakuQuiz. A context keeps the one value;
// the server blocks around stay server components (they are the children).
// Home v3 (2026-10-29): a fourth filter, Start easy (both sites); the search then opens KpopQuiz's, as on All. The button's accessible
// name is the site it opens (review fix), so it always says where it goes.
import { createContext, useContext, useMemo, useState } from 'react';

import { SearchIcon } from './home-icons';

export type HotFilterId = 'all' | 'kpop' | 'anime' | 'easy';

interface FilterState {
  readonly filter: HotFilterId;
  readonly setFilter: (f: HotFilterId) => void;
}

const FilterContext = createContext<FilterState>({ filter: 'all', setFilter: () => {} });

export function HomeFilterProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [filter, setFilter] = useState<HotFilterId>('all');
  const value = useMemo(() => ({ filter, setFilter }), [filter]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useHotFilter(): FilterState {
  return useContext(FilterContext);
}

/** The site whose search page the button opens: OtakuQuiz on the OtakuQuiz filter, KpopQuiz otherwise (All and Start easy too). */
export function searchSite(filter: HotFilterId): 'kpop' | 'anime' {
  return filter === 'anime' ? 'anime' : 'kpop';
}

/** Where the search button goes for a filter, and its accessible name: the name of that site ("Search OtakuQuiz"), never "both sites". */
export function searchTarget(
  filter: HotFilterId,
  hrefs: Readonly<Record<'kpop' | 'anime', string>>,
  labels: Readonly<Record<'kpop' | 'anime', string>>,
): { readonly href: string; readonly label: string } {
  const site = searchSite(filter);
  return { href: hrefs[site], label: labels[site] };
}

/** The search button of the top bar: the design's round button, a link to the canonical search page of the site the filter names. */
export function HomeSearch({ hrefs, labels }: { hrefs: Readonly<Record<'kpop' | 'anime', string>>; labels: Readonly<Record<'kpop' | 'anime', string>> }): React.ReactElement {
  const { filter } = useHotFilter();
  const { href, label } = searchTarget(filter, hrefs, labels);
  return (
    <a href={href} aria-label={label} className="hub-h2-iconbtn hub-h2-btn"><SearchIcon /></a>
  );
}
