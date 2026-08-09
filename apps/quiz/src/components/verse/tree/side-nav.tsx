// V3 nav (iteration 2) - the ONE Verse nav: the global top-bar chrome is relocated here on top
// (real KpopVerse logo -> Play/Fandoms/Community + search/theme/profile), then the space chip +
// quick links, the Navigate tree (crawlable nested <a> in <details>), a divider, and the client
// scroll-spy TOC. The global TopNav is hidden on /verse (see top-nav-bar.tsx / mobile-top-bar.tsx),
// so this rail is the single navigation. Fold state (open / 64px icon rail + peek / drawer) is pure
// CSS via the #v-nav-collapse / #v-nav-drawer checkboxes; the only client JS is VerseTocSpy.
import Link from 'next/link';

import { VerseLogo } from '@/components/verse/brand/verse-logo';
import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';
import { WorldToggle } from '@/components/layout/world-toggle';
import { TopNavLinks } from '@/components/layout/top-nav-links';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { TopNavProfile } from '@/components/layout/top-nav-profile';
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
      {/* GLOBAL chrome, relocated from the top navbar so this rail is the one nav. */}
      <div className="v-side-top">
        <div className="v-side-brandrow">
          <span className="v-side-logo-full"><VerseLogo height={21} /></span>
          <Link href="/verse" className="v-side-logo-mark" aria-label="KpopVerse home"><OrbitMark size={28} /></Link>
          <label htmlFor="v-nav-collapse" className="v-side-collapse" title="Collapse sidebar" aria-label="Collapse or expand the sidebar">
            <span className="v-side-collapse-glyph" aria-hidden="true">&#9666;</span>
          </label>
        </div>
        <div className="v-side-primary">
          <WorldToggle />
          <TopNavLinks world="verse" />
        </div>
        <div className="v-side-actions">
          <Link href="/verse?search=1" className="v-side-action" aria-label="Search the Verse">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <span className="v-side-action-lbl">Search</span>
          </Link>
          <span className="v-side-action v-side-themewrap"><ThemeToggle className="v-side-themebtn" /></span>
          <span className="v-side-profilewrap"><TopNavProfile /></span>
        </div>
      </div>

      {/* SPACE identity + quick links. */}
      <Link href={`/verse/${spaceSlug}`} className="v-side-chip">
        <span className="v-side-chip-ic" aria-hidden="true">{spaceLabel.slice(0, 1)}</span>
        <span className="v-side-chip-tx">{spaceLabel}</span>
      </Link>
      <div className="v-side-quick">
        <Link href={`/verse/${spaceSlug}`} className="v-side-quicklink">
          <span className="v-side-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg></span>
          <span className="v-side-lbl">Space home</span>
        </Link>
        <Link href="/verse" className="v-side-quicklink">
          <span className="v-side-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.5 9h17M3.5 15h17" /></svg></span>
          <span className="v-side-lbl">Browse everything</span>
        </Link>
      </div>

      {/* NAVIGATE - the crawlable space tree. */}
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
