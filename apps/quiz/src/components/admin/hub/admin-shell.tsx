// ADMIN-2 (PLAN-ADMIN-2 section 2): the frame of every page of the hub admin: the left menu (a section per site, its tools below) and the
// content. A server component: the secret address (`prefix`) arrives as a prop from the page, which got it from requireAdminDoor(), and
// reaches only the admin's browser. Every link carries ?site=, so the site is always the interface's choice.
import Link from 'next/link';

import { adminHref, buildMenu } from '@/lib/admin/menu';

import type { ToolKey } from '@/lib/admin/menu';
import type { SiteId } from '@/lib/site/types';

// The responsive layout of the admin is its own few lines of CSS, scoped by class prefix and shipped in the admin's page only: a Tailwind
// utility used here would add a rule to the sheet of every site (kpopquiz.org included), which F0's contract test and the parity proof forbid.
const SHELL_CSS = [
  '.adm-shell{display:flex;flex-direction:column;gap:1.5rem}',
  '.adm-nav{font-size:.875rem}',
  '.adm-tools{display:flex;flex-wrap:wrap;gap:.25rem 1rem;margin:0;padding:0;list-style:none}',
  '@media (min-width:768px){.adm-shell{flex-direction:row}.adm-nav{width:13rem;flex-shrink:0}.adm-tools{flex-direction:column}}',
].join('');

interface AdminShellProps {
  readonly prefix: string;
  readonly site: SiteId | null;
  readonly tool: ToolKey;
  readonly title: string;
  readonly children: React.ReactNode;
}

export function AdminShell({ prefix, site, tool, title, children }: AdminShellProps): React.ReactElement {
  const menu = buildMenu(prefix, site, tool);
  return (
    <div
      className="relative px-4 py-4"
      style={{ width: 'min(1100px, calc(100vw - 32px))', left: '50%', transform: 'translateX(-50%)' }}
    >
      <style>{SHELL_CSS}</style>
      <div className="adm-shell">
        <nav aria-label="Admin" className="adm-nav">
          <Link href={adminHref(prefix, '', null)} className={`block mb-3 font-medium ${site === null && tool === 'overview' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            All sites
          </Link>
          <Link href={adminHref(prefix, '/journal', null)} className={`block mb-4 ${site === null && tool === 'journal' ? 'text-primary font-medium' : 'text-secondary hover:text-primary'}`}>
            Journal, all sites
          </Link>
          {menu.map((section) => (
            <div key={section.site} className="mb-4">
              <p className={`uppercase tracking-wide text-xs mb-1 ${section.current ? 'text-primary font-medium' : 'text-secondary'}`}>{section.label}</p>
              <ul className="adm-tools">
                {section.tools.map((t) => (
                  <li key={t.key}>
                    <Link href={t.href} aria-current={t.current ? 'page' : undefined} className={t.current ? 'text-primary font-medium' : 'text-secondary hover:text-primary'}>
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <section className="min-w-0 flex-1">
          <h1 className="text-xl font-medium text-primary mb-4">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  );
}
