// Shared, pure JSX icon helpers + href resolvers for the Verse sidebar. No 'use client' and no
// server-only imports, so BOTH the server VerseSideNav and the client rows/accordion can use them.
import type { NavNode, NavRef } from '@/lib/verse/tree/nav';

export function hrefFor(spaceSlug: string, ref: NavRef | undefined): string | null {
  if (!ref) return null;
  if (ref.kind === 'page') return `/verse/${spaceSlug}/${ref.slug}`;
  return null; // an auto-index target renders as a plain label until its index route lands
}
// A section with no target of its own opens to its first child page, so its rail icon still navigates.
export function sectionHref(spaceSlug: string, n: NavNode): string | null {
  return hrefFor(spaceSlug, n.ref) ?? (n.children ?? []).map((c) => hrefFor(spaceSlug, c.ref)).find(Boolean) ?? null;
}

const svg = (children: React.ReactNode): React.ReactElement => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

// A small stroke icon per top-level section, keyed by a normalized label (initial-dot fallback).
export function SectionIcon({ label }: { label: string }): React.ReactElement {
  const l = label.toLowerCase();
  if (/music|song|disco|album|track/.test(l)) return svg(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
  if (/member|idol|people|roster/.test(l)) return svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>);
  if (/show|tour|tv|video|watch|stage/.test(l)) return svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M10 8l4 2.5-4 2.5z" fill="currentColor" stroke="none" /><path d="M8 21h8" /></>);
  if (/fandom|army|community|fan/.test(l)) return svg(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />);
  if (/about|info|company|award|record|history/.test(l)) return svg(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>);
  return svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>);
}

export const ICONS = {
  play: svg(<polygon points="9 7 17 12 9 17 9 7" fill="currentColor" stroke="none" />),
  fandoms: svg(<><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" /></>),
  community: svg(<><circle cx="9" cy="7" r="3.4" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1z" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.5 13.6A4.6 4.6 0 0 1 21.5 18v1H18" /></>),
  search: svg(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  person: svg(<><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></>),
  home: svg(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
  browse: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.5 9h17M3.5 15h17" /></>),
};
