// W3K.6 - name resolution + disambiguation. A top-level /verse/{name} that is not a
// group slug or alias is matched against idol (and group) names. One match redirects
// to its canonical page; several matches render a disambiguation page. Fail-safe: any
// error resolves to an empty candidate set, so the caller falls through to notFound().
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { idolSlug } from '@/lib/verse/slug';

export interface NameCandidate {
  type: 'idol' | 'group';
  name: string;
  detail: string;   // e.g. the group, for context
  href: string;     // canonical page
}

const norm = (s: string): string => s.toLowerCase().trim();

/** All entities whose name slugifies to `term` (idols across groups, plus groups). */
export const resolveName = cache(async (term: string): Promise<NameCandidate[]> => {
  const slug = norm(term);
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return [];
  try {
    const db = createPublicReadClient();
    const [{ data: idols }, { data: groups }] = await Promise.all([
      db.from('idols').select('name, groups(slug, name)').eq('active', true),
      db.from('groups').select('slug, name'),
    ]);

    const out: NameCandidate[] = [];
    type IdolRow = { name: string; groups: { slug: string; name: string } | { slug: string; name: string }[] | null };
    for (const i of (idols ?? []) as unknown as IdolRow[]) {
      const g = Array.isArray(i.groups) ? i.groups[0] : i.groups;
      if (!g || idolSlug(i.name) !== slug) continue;
      out.push({ type: 'idol', name: i.name, detail: `Member of ${g.name}`, href: `/verse/${g.slug}/members/${idolSlug(i.name)}` });
    }
    for (const g of (groups ?? []) as Array<{ slug: string; name: string }>) {
      if (idolSlug(g.name) !== slug || g.slug === slug) continue; // slug!==term: exact-slug groups resolve directly, not here
      out.push({ type: 'group', name: g.name, detail: 'Group', href: `/verse/${g.slug}` });
    }
    return out;
  } catch {
    return [];
  }
});
