import { getModeById, getGroupSlugFromModeId, isGroupModeId } from '@/lib/blind-test-modes';
import { isThemedModePlayable } from '@/lib/blind-test-playlists';
import { isThemePage } from '@/lib/growth/bt-themes';
import { UX_V1 } from '@/lib/ux-v1';
import { getPlayableGroups, hasDbEnv, settle } from '@/lib/ux-v1/p6/hub-data';
import { isUxV12 } from '@/lib/ux-v12';

import type { BtGroup } from '@/lib/ux-v1/p6/playlists';

// The reads that decide whether /blindtest/[mode] renders or answers 404. The page
// (app/(site)/blindtest/[mode]/page.tsx) calls them, and so does the legacy /blind-test
// handler (app/api/legacy/blind-test) through blindtestPageRenders, so a 301 it sends never
// lands on a 404 (owner, 2026-10-27; rulebook section 9).

/** Flag on: is this id a themed mode under its song floor? null when the count cannot be read. Flag off: never (no query). */
export async function themeHidden(modeId: string): Promise<boolean | null> {
  if (!isUxV12() || !isThemePage(modeId)) return false;
  try {
    return !(await isThemedModePlayable(modeId));
  } catch {
    return null;
  }
}

/** Flag on: is this id a themed mode that must stay hidden? Flag off: never (no query). */
export async function hiddenTheme(modeId: string): Promise<boolean> {
  return (await themeHidden(modeId)) ?? true; // fail closed: no dead door when the count cannot be read
}

/**
 * V12 (owner, 2026-10-13: SEO): a group page is a real group with a playable pool, else a
 * true 404 (any made-up group-<slug> used to answer 200 with an empty page). `list` is the
 * playable groups; null when that read failed (a DB blip keeps the v11 page, never a false 404).
 */
export async function playableGroup(modeId: string): Promise<{ group: BtGroup | null; list: BtGroup[] | null }> {
  if (!isUxV12() || !hasDbEnv()) return { group: null, list: null };
  const slug = getGroupSlugFromModeId(modeId);
  const read = await settle<BtGroup[] | null>(() => getPlayableGroups(), null);
  if (!read.ok || !read.value) return { group: null, list: null };
  return { group: read.value.find((g) => g.slug === slug) ?? null, list: read.value };
}

/**
 * Does /blindtest/<segment> render (true) or answer 404 (false)? null when that cannot be
 * told now (a read failed: the page then shows a fallback or hides a theme, and either may
 * change once the read works). The static pages first (Next serves them before [mode]), then
 * the [mode] page's notFound steps, in its order, on its reads.
 */
export async function blindtestPageRenders(segment: string): Promise<boolean | null> {
  if (segment === 'leaderboard') return true; // blindtest/leaderboard: no notFound
  if (segment === 'ranked') return UX_V1; // blindtest/ranked: notFound() without the v11 flag
  if (isGroupModeId(segment)) {
    if (!getGroupSlugFromModeId(segment)) return false;
    const v12 = await playableGroup(segment);
    if (v12.list) return v12.group !== null;
    // No list: with V12 on and a database, the read failed. Otherwise the page renders its
    // v11 group page for any slug, without a read.
    return isUxV12() && hasDbEnv() ? null : true;
  }
  if (!getModeById(segment)) return false;
  const hidden = await themeHidden(segment);
  return hidden === null ? null : !hidden;
}
