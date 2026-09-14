'use client';

import { useState } from 'react';

import { HUB_FILTERS, HUB_FILTER_LABEL, type HubFilter } from '@/lib/games/hub-filters';

// Client-side filter over the card grid. The cards themselves are server-rendered
// (crawlable) as children; this only toggles a data attribute on the grid and CSS
// hides the non-matching cards, so the filter never removes a card from the HTML
// (SEO) and makes no fetch. Each card carries data-tag="solo timed" etc. The "All
// games" heading shares the chips' row (artboard), so it is passed in as `heading`.
const FILTERS = HUB_FILTERS;
const LABEL = HUB_FILTER_LABEL;

export function GamesFilter({ heading, children }: { heading?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  const [active, setActive] = useState<HubFilter>('all');
  return (
    <>
      <div className="gh-all-bar">
        {heading}
        <div className="gh-filters" role="tablist" aria-label="Filter games">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active === f}
              className={`gh-fchip${active === f ? ' on' : ''}`}
              data-testid={`filter-${f}`}
              onClick={() => setActive(f)}
            >
              {LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="gh-grid" data-filter={active} data-testid="gh-grid">
        {children}
      </div>
    </>
  );
}
