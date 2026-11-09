// O1 audit 03 P1-6 (rulebook 1.3): a group variant of a page type needs 300+ impressions in 90 days (or 30+ Copilot
// citations in a quarter); otherwise it is a section of the group hub, not an indexed URL of its own.
//
// Which groups miss the bar is read from the Search Console exports (scripts/seo-gsc-triage.mts: NOINDEX-PROPOSE on the
// bt-group, name-all and which-member templates). Those exports do not exist yet, and the guard of section 3 forbids a
// noindex on a URL with clicks in 90 days without the owner. So DEMAND_DEMOTED is EMPTY: every page and the sitemap
// stay as they are. When the owner has approved a triage, the slugs go in below in one reviewed edit, and for each slug:
//   - the page answers noindex,follow (it stays playable, linked from the hub),
//   - the sitemap drops it,
// both read from this one list, so the page and the sitemap cannot disagree (rulebook 9.6).

export type DemandTemplate = 'bt-group' | 'name-all' | 'which-member';

/** Group slugs below the demand bar and approved by the owner, per template. Empty until the triage exists. */
export const DEMAND_DEMOTED: Readonly<Record<DemandTemplate, readonly string[]>> = {
  'bt-group': [],
  'name-all': [],
  'which-member': [],
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
