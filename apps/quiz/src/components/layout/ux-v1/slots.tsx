'use client';

// Shell SLOTS filled by page agents (worker prompt: "top nav ... with slots for the
// search trigger and bell trigger; P11 builds the search overlay and bell panel
// content"). A0 owns the triggers, the overlay / popover frames, focus and closing;
// the content below is A0's minimal real default until P11 ships its own. P11:
// export `SearchResults` from components/search/ux-v1/search-results.tsx and
// `BellPanel` from components/notifications/ux-v1/bell-panel.tsx with these exact
// props, then file a request (v11/requests/P11.md); A0 swaps the two exports here.

import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';

export interface SearchResultsProps {
  /** The live query (trimmed). */
  query: string;
  /** Call before navigating so the overlay closes. */
  onNavigate: () => void;
}

/** Default search body: sends the query to the existing /search page (real results). */
export function SearchResults({ query, onNavigate }: SearchResultsProps): React.ReactElement {
  if (!query) return <p className="ux-sov-hint">Search quizzes, groups and songs. Press Enter to see every result.</p>;
  return (
    <div>
      <div className="ux-sov-l">Search</div>
      <Link className="ux-srow is-active" href={`/search?q=${encodeURIComponent(query)}`} onClick={onNavigate}>
        <span className="ux-srow-th is-sq"><Icon name="search" size="sm" /></span>
        <span>Search for &quot;{query}&quot;</span>
        <small>Enter</small>
      </Link>
    </div>
  );
}

export interface BellPanelProps {
  unread: number;
  onClose: () => void;
}

/** Default bell body: the real unread count; the full panel (latest 6, Mark all read) is P11's. */
export function BellPanel({ unread }: BellPanelProps): React.ReactElement {
  return <p className="ux-bellpop-empty">{unread > 0 ? `${unread} unread` : 'You are all caught up.'}</p>;
}
