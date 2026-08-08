// V-FOUNDATION F1 Phase C - the FACT RAIL (prototype screen 01, note 8). A grouped
// infobox for entity-bound pages, built from the ONE relational source of truth, with
// COMPUTED fields (age, years active) that are always current and never hand-copied
// (our unfair advantage over fandom's hand-duplicated, drifting infoboxes). Every row
// is marked auto = derived from data. Absent data -> the row is omitted (honest
// emptiness, min-gate), never faked.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageRow } from './types';

export interface FactRow { dt: string; dd: string; auto?: boolean }
export interface FactSection { heading: string; rows: FactRow[] }

function yearsBetween(fromIso: string | null | undefined, now: Date): number | null {
  if (!fromIso) return null;
  const m = fromIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const from = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let y = now.getFullYear() - from.getFullYear();
  const md = now.getMonth() - from.getMonth() || now.getDate() - from.getDate();
  if (md < 0) y -= 1;
  return y >= 0 ? y : null;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Build the grouped infobox for a page's entity binding. v1 supports the 'idol' kind
 * (member pages); other kinds return null until their builders land (flagged). */
export async function buildFactRail(db: SupabaseClient, page: PageRow, now: Date): Promise<FactSection[] | null> {
  if (page.entity_kind !== 'idol' || page.entity_id == null) return null;

  const { data: idol } = await db.from('idols')
    .select('name, name_hangul, birth_date, nationality, positions, group_id')
    .eq('id', page.entity_id).maybeSingle();
  if (!idol) return null;
  const i = idol as { name: string; name_hangul: string | null; birth_date: string | null; nationality: string | null; positions: string[] | null; group_id: number };

  const { data: group } = await db.from('groups')
    .select('name, fandom_name, inception_date').eq('id', i.group_id).maybeSingle();
  const g = group as { name: string; fandom_name: string | null; inception_date: string | null } | null;

  const sections: FactSection[] = [];

  // Personal
  const personal: FactRow[] = [];
  if (i.name) personal.push({ dt: 'Name', dd: i.name });
  const born = fmtDate(i.birth_date);
  const age = yearsBetween(i.birth_date, now);
  if (born) personal.push({ dt: 'Born', dd: age != null ? `${born} (age ${age})` : born, auto: age != null });
  if (i.nationality) personal.push({ dt: 'From', dd: i.nationality });
  if (personal.length) sections.push({ heading: 'Personal', rows: personal });

  // Group
  if (g) {
    const grp: FactRow[] = [];
    const debut = fmtDate(g.inception_date);
    const active = yearsBetween(g.inception_date, now);
    if (debut) grp.push({ dt: 'Debut', dd: debut });
    if (active != null) grp.push({ dt: 'Years active', dd: `${active} years`, auto: true });
    const pos = (i.positions ?? []).filter(Boolean);
    if (pos.length) grp.push({ dt: 'Positions', dd: pos.join(', ') });
    if (g.fandom_name) grp.push({ dt: 'Fandom', dd: g.fandom_name });
    if (grp.length) sections.push({ heading: g.name, rows: grp });
  }

  return sections.length ? sections : null;
}
