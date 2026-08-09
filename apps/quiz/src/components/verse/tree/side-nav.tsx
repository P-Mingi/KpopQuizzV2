// V3 nav - the persistent foldable LEFT sidebar (Notion/Fandom style). Holds, top to bottom:
// the brand + a collapse control, the space chip, "Navigate" (the getNavMenu space nav rendered
// as CRAWLABLE nested <a> inside native <details> groups - no JS, expand/collapse is the element's
// own), a divider, and the client scroll-spy TOC (VerseTocSpy). The fold states (open / 64px icon
// rail + hover-peek / mobile drawer) are pure CSS driven by the #v-nav-collapse / #v-nav-drawer
// checkboxes in the layout; the collapse glyph flips via :has(). Section icons show in the rail.
import Link from 'next/link';

import { VerseTocSpy } from './toc-spy';

import type { NavNode, NavRef } from '@/lib/verse/tree/nav';

function hrefFor(spaceSlug: string, ref: NavRef | undefined): string | null {
  if (!ref) return null;
  if (ref.kind === 'page') return `/verse/${spaceSlug}/${ref.slug}`;
  return null; // an auto-index target renders as a plain label until its index route lands
}

// A small stroke icon per top-level section, shown in the collapsed icon rail. Keyed by a
// normalized label with an initial-dot fallback, so a curator's custom section still gets a glyph.
function SectionIcon({ label }: { label: string }): React.ReactElement {
  const l = label.toLowerCase();
  const svg = (children: React.ReactNode): React.ReactElement => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  );
  if (/music|song|disco|album|track/.test(l)) return svg(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
  if (/member|idol|people|roster/.test(l)) return svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>);
  if (/show|tour|tv|video|watch|stage/.test(l)) return svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M10 8l4 2.5-4 2.5z" fill="currentColor" stroke="none" /><path d="M8 21h8" /></>);
  if (/fandom|army|community|fan/.test(l)) return svg(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />);
  if (/about|info|company|award|record|history/.test(l)) return svg(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>);
  return svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>);
}

export function VerseSideNav({ spaceSlug, tree, spaceName, spaceLabel }: {
  spaceSlug: string; tree: NavNode[]; spaceName: string; spaceLabel: string;
}): React.ReactElement {
  return (
    <aside className="v-sidenav" aria-label={`${spaceName} navigation`}>
      <div className="v-side-head">
        <Link href="/verse" className="v-side-brand">
          <span className="v-side-mark" aria-hidden="true">V</span>
          <span className="v-side-brandtext">Verse</span>
        </Link>
        <label htmlFor="v-nav-collapse" className="v-side-collapse" title="Collapse sidebar" aria-label="Collapse or expand the sidebar">
          <span className="v-side-collapse-glyph" aria-hidden="true">&#9666;</span>
        </label>
      </div>

      <Link href={`/verse/${spaceSlug}`} className="v-side-chip">
        <span className="v-side-chip-ic" aria-hidden="true">{spaceLabel.slice(0, 1)}</span>
        <span className="v-side-chip-tx">{spaceLabel}</span>
      </Link>

      <nav className="v-side-nav" aria-label="Space sections">
        <p className="v-side-eyebrow">Navigate</p>
        <ul className="v-side-list">
          {tree.map((n, i) => {
            const kids = n.children ?? [];
            const href = hrefFor(spaceSlug, n.ref);
            if (kids.length) {
              return (
                <li key={i} className="v-side-item">
                  <details className="v-side-sect" open>
                    <summary className="v-side-row">
                      <span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span>
                      <span className="v-side-lbl">{n.label}</span>
                      <span className="v-side-chev" aria-hidden="true">&#9662;</span>
                    </summary>
                    <ul className="v-side-sub">
                      {kids.map((c, j) => {
                        const ch = hrefFor(spaceSlug, c.ref);
                        return (
                          <li key={j}>
                            {ch ? <Link href={ch} className="v-side-link">{c.label}</Link>
                                : <span className="v-side-link disabled">{c.label}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              );
            }
            return (
              <li key={i} className="v-side-item">
                {href
                  ? <Link href={href} className="v-side-row v-side-leaf"><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></Link>
                  : <span className="v-side-row v-side-leaf"><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></span>}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="v-side-divider" />
      <VerseTocSpy />
    </aside>
  );
}
