'use client';
// Client pieces of the OPEN sidebar that need the current path (usePathname works in SSR too, so
// these render crawlable <a> in the initial HTML with the right active/expanded state - no flash):
//  - GlobalNavRows : Fandoms / Community as normal sidebar NAV ROWS (icon + label), active-tinted.
//  - NavAccordion  : the NAVIGATE tree as collapsible <details> sections, collapsed by default but
//    auto-open on the section that contains the current page. Children stay in the DOM (crawlable)
//    even when collapsed. Native <details> toggling - no JS beyond computing the initial open state.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { hrefFor, SectionIcon, ICONS } from './side-nav-icons';

import type { NavNode } from '@/lib/verse/tree/nav';

const under = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(href + '/');

export function GlobalNavRows(): React.ReactElement {
  const pathname = usePathname();
  // Fandoms = the /verse directory exactly; Community = the shared community area. On a space
  // home neither lights up (the space chip + Space home below carry "you are here").
  const rows = [
    { href: '/verse', label: 'Fandoms', icon: ICONS.fandoms, active: pathname === '/verse' },
    { href: '/verse/community', label: 'Community', icon: ICONS.community, active: under(pathname, '/verse/community') },
  ];
  return (
    <>
      {rows.map((r) => (
        <Link key={r.href} href={r.href} className={`v-side-row${r.active ? ' active' : ''}`} aria-current={r.active ? 'page' : undefined}>
          <span className="v-side-ic" aria-hidden="true">{r.icon}</span>
          <span className="v-side-lbl">{r.label}</span>
        </Link>
      ))}
    </>
  );
}

export function NavAccordion({ spaceSlug, tree }: { spaceSlug: string; tree: NavNode[] }): React.ReactElement {
  const pathname = usePathname();
  const isActive = (href: string | null): boolean => !!href && under(pathname, href);

  return (
    <ul className="v-side-list">
      {tree.map((n, i) => {
        const kids = n.children ?? [];
        const href = hrefFor(spaceSlug, n.ref);
        if (kids.length) {
          const childHrefs = kids.map((c) => hrefFor(spaceSlug, c.ref));
          // collapsed by default; auto-open the section whose child (or self) is the current page.
          const sectionActive = isActive(href) || childHrefs.some(isActive);
          return (
            <li key={i} className="v-side-item">
              <details className="v-side-sect" open={sectionActive}>
                <summary className="v-side-row">
                  <span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span>
                  <span className="v-side-lbl">{n.label}</span>
                  <span className="v-side-chev" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
                </summary>
                <ul className="v-side-sub">
                  {kids.map((c, j) => {
                    const ch = hrefFor(spaceSlug, c.ref);
                    return (
                      <li key={j}>
                        {ch ? <Link href={ch} className={`v-side-link${isActive(ch) ? ' active' : ''}`} aria-current={isActive(ch) ? 'page' : undefined}>{c.label}</Link>
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
              ? <Link href={href} className={`v-side-row v-side-leaf${isActive(href) ? ' active' : ''}`} aria-current={isActive(href) ? 'page' : undefined}><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></Link>
              : <span className="v-side-row v-side-leaf"><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></span>}
          </li>
        );
      })}
    </ul>
  );
}
