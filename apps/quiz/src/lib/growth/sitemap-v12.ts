// V12 (flag only): the growth URLs other agents asked G3 to list in the sitemap
// (requests G6 R2 and G5 R2). Pure, so the list is unit tested without a database.
//
// Only the public, indexable URL of each page is listed: the pretty per-group URL,
// never the internal route behind it (/name-all/<group> and /personality/<group> are
// noindex or redirected). None of these pages has a /pt mirror.

import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { BRIDGE_PATH } from '@/lib/personality/bridge';
import { whichMemberPath } from '@/lib/personality/view';

/**
 * Paths (no origin), in a stable order: the 17 Name them all pages, the KPop Demon
 * Hunters bridge quiz, then one Which member are you page per group that has a
 * profile set (`wmaSlugs`, from getWmaGroupSlugs(); empty when that read failed, so a
 * database blip drops those entries and nothing else).
 */
export function v12GrowthPaths(wmaSlugs: readonly string[]): string[] {
  const out = new Set<string>();
  for (const slug of NAME_ALL_GROUPS) out.add(prettyPath(slug));
  out.add(BRIDGE_PATH);
  for (const slug of wmaSlugs) {
    // A slug is a path segment: anything else never becomes a URL.
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) out.add(whichMemberPath(slug));
  }
  return [...out];
}
