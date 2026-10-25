'use client';

// Run O1, lot H2c: the filter of "Hot right now" (All, KpopQuiz, OtakuQuiz) is shared with the search button of the top bar, which
// leads to the search page of KpopQuiz on All and KpopQuiz and to the one of OtakuQuiz on OtakuQuiz. A context keeps the one value;
// the server blocks around stay server components (they are the children).
import { createContext, useContext, useMemo, useState } from 'react';

import { SearchIcon } from './home-icons';

export type HotFilterId = 'all' | 'kpop' | 'anime';

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

/** The site whose search page the button opens: OtakuQuiz on the OtakuQuiz filter, KpopQuiz otherwise. */
export function searchSite(filter: HotFilterId): 'kpop' | 'anime' {
  return filter === 'anime' ? 'anime' : 'kpop';
}

/** The search button of the top bar: the design's round button, a link to the canonical search page of the site the filter names. */
export function HomeSearch({ hrefs, label }: { hrefs: Readonly<Record<'kpop' | 'anime', string>>; label: string }): React.ReactElement {
  const { filter } = useHotFilter();
  return (
    <a href={hrefs[searchSite(filter)]} aria-label={label} className="hub-h2-iconbtn hub-h2-btn"><SearchIcon /></a>
  );
}
