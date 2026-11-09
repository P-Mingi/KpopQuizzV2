// O1 audit 03 P1-6 (rulebook 1.3): a group variant of a page type needs 300+ impressions in 90 days (or 30+ Copilot
// citations in a quarter); otherwise it is a section of the group hub, not an indexed URL of its own.
//
// Which groups miss the bar is read from the Search Console Performance export of 2026-11-09 (3 months, scripts/seo-gsc-triage.mts
// --perf-urls): the variant pages under 300 impressions AND with no click in 90 days. The guard of section 3 forbids a noindex
// on a URL with clicks without the owner, so a variant with even one click is NOT listed here: those wait for the owner's answer.
// When the owner answers, the slugs go in below in one reviewed edit, and for each slug:
//   - the page answers noindex,follow (it stays playable, linked from the hub),
//   - the sitemap drops it,
// both read from this one list, so the page and the sitemap cannot disagree (rulebook 9.6).

export type DemandTemplate = 'bt-group' | 'name-all' | 'which-member';

/** Group slugs below the demand bar and approved by the owner, per template. Empty until the triage exists. */
export const DEMAND_DEMOTED: Readonly<Record<DemandTemplate, readonly string[]>> = {
  'bt-group': [
    '2ne1',
    'artms',
    'bibi',
    'billlie',
    'bts',
    'chungha',
    'enhypen',
    'exo',
    'g-i-dle',
    'hyuna',
    'jennie',
    'jimin',
    'jungkook',
    'kara',
    'kiss-of-life',
    'mamamoo',
    'nct-dream',
    'purple-kiss',
    'red-velvet',
    'seventeen',
    'sistar',
    'taeyang',
    'taeyeon',
    'twice',
    'txt',
    'zico',
  ],
  'name-all': [
    'g-i-dle',
    'newjeans',
    'red-velvet',
    'txt',
  ],
  'which-member': [
    'blackpink',
    'bts',
    'enhypen',
    'itzy',
    'newjeans',
    'twice',
  ],
};

export const isDemoted = (template: DemandTemplate, groupSlug: string): boolean => DEMAND_DEMOTED[template].includes(groupSlug);

/** Which template and group a public path belongs to, or null (not a variant page). */
export function variantOfPath(path: string): { template: DemandTemplate; slug: string } | null {
  const bt = /^\/blindtest\/group-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if (bt) return { template: 'bt-group', slug: bt[1]! };
  const na = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)-name-all-members$/.exec(path);
  if (na) return { template: 'name-all', slug: na[1]! };
  const wm = /^\/which-([a-z0-9]+(?:-[a-z0-9]+)*)-member-are-you$/.exec(path);
  if (wm) return { template: 'which-member', slug: wm[1]! };
  return null;
}

/** True when the path is a variant page the owner moved under its hub. */
export function isDemotedPath(path: string): boolean {
  const v = variantOfPath(path);
  return v !== null && isDemoted(v.template, v.slug);
}

/** `robots` for a variant page: noindex,follow when demoted, nothing (today's head) otherwise. */
export function demandRobots(template: DemandTemplate, groupSlug: string): { robots: { index: false; follow: true } } | Record<string, never> {
  return isDemoted(template, groupSlug) ? { robots: { index: false, follow: true } } : {};
}
