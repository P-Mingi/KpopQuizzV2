// Slug generation for published tier lists. Deterministic, URL-safe, and made
// unique against the slugs already taken (the caller passes the existing set;
// the DB unique constraint on tier_lists.slug is the final guard).

/** Lowercase, ASCII-fold the common cases, hyphenate, trim. */
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return base || 'tier-list';
}

/**
 * Return a slug not already in `taken`. Appends -2, -3, ... on collision.
 * The suffix keeps the whole slug within the 64-char column budget.
 */
export function makeUniqueSlug(title: string, taken: ReadonlySet<string>): string {
  const base = slugify(title);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, 63 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
