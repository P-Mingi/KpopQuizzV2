// SEO Mission 2 (owner, 2026-10-14; rulebook 1.6): a new quiz cannot take the slug
// "{group}-quiz", "{group}-test" or "{group}-trivia". /q/bts-quiz would compete with the hub
// /bts-quiz for the same query. Such a slug becomes "{group}-fan-quiz" (or -fan-test,
// -fan-trivia) before the uniqueness check of the create route adds its "-2", "-3"...
// Existing quizzes are never renamed: their slugs are live, indexed URLs.
// Pure and unit tested (hub-slugs.test.ts).

const HUB_SLUG = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(quiz|test|trivia)$/;

/** The group slug a hub-shaped slug names ("stray-kids-quiz" gives "stray-kids"), else null. */
export function hubSlugGroup(slug: string): { group: string; kind: 'quiz' | 'test' | 'trivia' } | null {
  const m = HUB_SLUG.exec(slug);
  return m ? { group: m[1]!, kind: m[2] as 'quiz' | 'test' | 'trivia' } : null;
}

/**
 * The slug a new quiz may take: `slug` itself, or "{group}-fan-{kind}" when `slug` is the
 * hub-shaped slug of a group (`isGroupSlug` says which strings are group slugs).
 */
export async function avoidHubSlug(slug: string, isGroupSlug: (group: string) => boolean | Promise<boolean>): Promise<string> {
  const hub = hubSlugGroup(slug);
  if (!hub || !(await isGroupSlug(hub.group))) return slug;
  return `${hub.group}-fan-${hub.kind}`;
}
