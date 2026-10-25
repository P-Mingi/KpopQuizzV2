// SEO Mission 3, part D, point 1 (rulebook 9.4: "a slug change always ships with its 301").
//
// Before this file the site had no slug history: a renamed quiz or group URL answered 404 and
// lost its links. Now:
//   - writing: two triggers record every slug UPDATE on quizzes and groups into
//     seo_slug_redirects (docs/pending-migrations/seo-watch.sql), whoever makes it (the app, the
//     admin, a SQL restore, an import). A route that makes a slug disappear without an UPDATE
//     (the admin group merge deletes the old row) calls recordSlugRedirect().
//   - serving: when no live quiz or group has the requested slug, the page asks
//     renamedTarget() before answering 404, and answers a permanent redirect to the new URL
//     (/q/<slug>, /<group>-quiz, /<group>-trivia, /blindtest/group-<group>).
// The guard test (slug-301-guard.test.ts) fails when new code changes a slug outside these paths.
//
// Next answers permanentRedirect() with a 308. Google and Bing treat 308 exactly like 301 (both
// permanent, both pass the link); next.config redirects with permanent: true already answer 308.
//
// Fail soft: until the SQL is applied, or when the read fails or is slow, renamedTarget() is
// null and the page answers its usual 404.

import { cache } from 'react';
import { permanentRedirect } from 'next/navigation';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { SupabaseClient } from '@supabase/supabase-js';

export type SlugKind = 'quiz' | 'group';

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const READ_TIMEOUT_MS = 2500;

/** The new slug for a mapping row, or null when the row is unusable (bad slug, self loop). */
export function targetOf(oldSlug: string, row: { new_slug?: unknown } | null | undefined): string | null {
  const next = typeof row?.new_slug === 'string' ? row.new_slug : null;
  if (!next || next === oldSlug || !SLUG_RE.test(next)) return null;
  return next;
}

type Lookup = (kind: SlugKind, oldSlug: string) => Promise<{ new_slug?: unknown } | null>;

/** Ask the mapping; any failure, timeout or missing table is "no redirect". */
export async function lookupRenamed(kind: SlugKind, slug: string, lookup: Lookup, timeoutMs = READ_TIMEOUT_MS): Promise<string | null> {
  if (!SLUG_RE.test(slug)) return null;
  try {
    const row = await Promise.race([
      lookup(kind, slug),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return targetOf(slug, row);
  } catch {
    return null;
  }
}

const dbLookup: Lookup = async (kind, oldSlug) => {
  const db = createPublicReadClient();
  const { data, error } = await db.from('seo_slug_redirects').select('new_slug').eq('kind', kind).eq('old_slug', oldSlug).maybeSingle();
  if (error) return null;
  return data as { new_slug?: unknown } | null;
};

/** The slug this old slug was renamed to, or null. Deduplicated per request (metadata + page). */
export const renamedTarget = cache((kind: SlugKind, slug: string): Promise<string | null> => lookupRenamed(kind, slug, dbLookup));

/** The URL that replaces an old URL, for each page family. */
export const renamedPath = {
  quiz: (slug: string): string => `/q/${slug}`,
  groupHub: (slug: string): string => `/${slug}-quiz`,
  groupTrivia: (slug: string): string => `/${slug}-trivia`,
  groupBlindtest: (slug: string): string => `/blindtest/group-${slug}`,
} as const;

/**
 * Call right before a page answers 404 for an unknown slug: when the slug was renamed, this
 * throws Next's permanent redirect to the new URL; otherwise it returns and the page 404s.
 */
export async function redirectIfRenamed(kind: SlugKind, slug: string, toPath: (newSlug: string) => string): Promise<void> {
  const next = await renamedTarget(kind, slug);
  if (next) permanentRedirect(toPath(next));
}

/**
 * Record a slug that disappears without an UPDATE (a deleted row whose content moved). Server
 * only, service role. Fail soft: returns false when the SQL is not applied or the write fails.
 */
export async function recordSlugRedirect(svc: SupabaseClient, kind: SlugKind, oldSlug: string, newSlug: string): Promise<boolean> {
  if (!SLUG_RE.test(oldSlug) || !SLUG_RE.test(newSlug) || oldSlug === newSlug) return false;
  try {
    const { error } = await svc.rpc('seo_record_slug_redirect', { p_kind: kind, p_old: oldSlug, p_new: newSlug });
    if (error) console.error(`[slug-redirects] not recorded (${kind} ${oldSlug} -> ${newSlug}): ${error.message}`);
    return !error;
  } catch {
    return false;
  }
}
