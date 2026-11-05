// ADMIN-2 (PLAN-ADMIN-2 section 2): the left menu of the one admin. Three sections (Bunnyverse, KpopQuiz, OtakuQuiz), the site chosen in
// the interface and carried as `?site=` on every link; the tools of a section are the ones that exist for that site. Pure: the prefix (the
// secret address) comes in as an argument from the server, nothing here reads it.
import { REGISTRY } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The order of the sections in the menu: the network first, then its two quiz sites. */
export const SECTION_ORDER: readonly SiteId[] = ['hub', 'kpop', 'anime'];

export type ToolKey = 'overview' | 'quizzes' | 'reports' | 'journal';

export interface MenuTool {
  readonly key: ToolKey;
  readonly label: string;
  /** The path under the admin's address ('' is the overview). */
  readonly path: string;
}

const OVERVIEW: MenuTool = { key: 'overview', label: 'Overview', path: '' };
const QUIZZES: MenuTool = { key: 'quizzes', label: 'Quizzes', path: '/quizzes' };
const REPORTS: MenuTool = { key: 'reports', label: 'Reports', path: '/reports' };
const JOURNAL: MenuTool = { key: 'journal', label: 'Journal', path: '/journal' };

/** The tools of one section. The hub has no quizzes of its own (it is the network page and the passport). */
export function toolsOf(site: SiteId): readonly MenuTool[] {
  return site === 'hub' ? [OVERVIEW, JOURNAL] : [OVERVIEW, QUIZZES, REPORTS, JOURNAL];
}

export function sectionLabel(site: SiteId): string {
  return REGISTRY[site].brand.name;
}

/** The address of a tool of the admin: '<prefix><path>?site=<site>' (no query for the all-sites views). */
export function adminHref(prefix: string, path: string, site: SiteId | null): string {
  return `${prefix}${path}${site === null ? '' : `?site=${site}`}`;
}

export interface MenuSection {
  readonly site: SiteId;
  readonly label: string;
  readonly current: boolean;
  readonly tools: ReadonlyArray<MenuTool & { readonly href: string; readonly current: boolean }>;
}

/** The whole menu for the chosen site (null: the all-sites overview, no section open) and the tool being shown. */
export function buildMenu(prefix: string, site: SiteId | null, tool: ToolKey): readonly MenuSection[] {
  return SECTION_ORDER.map((s) => ({
    site: s,
    label: sectionLabel(s),
    current: s === site,
    tools: toolsOf(s).map((t) => ({ ...t, href: adminHref(prefix, t.path, s), current: s === site && t.key === tool })),
  }));
}
