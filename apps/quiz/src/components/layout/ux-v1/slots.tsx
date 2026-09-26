// Shell SLOTS filled by page agents (worker prompt: "top nav ... with slots for the
// search trigger and bell trigger; P11 builds the search overlay and bell panel
// content"). A0 owns the triggers, the overlay / popover frames (the bell header
// with Mark all read, See all), focus and closing; the content is P11's
// (v11/requests/P11.md item 1): the search rows and the bell's latest 6.

export { SearchResults } from '@/components/search/ux-v1/search-results';
export type { SearchResultsProps } from '@/components/search/ux-v1/search-results';
export { BellPanel } from '@/components/notifications/ux-v1/bell-panel';
export type { BellPanelProps } from '@/components/notifications/ux-v1/bell-panel';
