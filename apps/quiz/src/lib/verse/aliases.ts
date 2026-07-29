// W3K.5 - resolve a name-variant alias to its canonical group slug for redirecting.
// Fail-safe: any error (including the table not existing yet) resolves to null, so the
// caller falls through to its normal notFound() behaviour.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';

const norm = (s: string): string => s.toLowerCase().trim();

/** Canonical group slug for an alias slug, or null if it is not a known alias. */
export const resolveGroupAlias = cache(async (slug: string): Promise<string | null> => {
  const alias = norm(slug);
  if (!/^[a-z0-9-]{1,120}$/.test(alias)) return null;
  try {
    const db = createPublicReadClient();
    const { data } = await db.from('verse_aliases').select('groups(slug)').eq('alias', alias).maybeSingle();
    const target = (data as { groups?: { slug?: string } } | null)?.groups?.slug;
    return target && target !== alias ? target : null;
  } catch {
    return null;
  }
});
