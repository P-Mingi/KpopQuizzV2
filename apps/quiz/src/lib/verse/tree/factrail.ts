// V-FOUNDATION F1 Phase C - the FACT RAIL (prototype screen 01, note 8). A grouped
// infobox for entity-bound pages, built from the ONE relational source of truth, with
// COMPUTED fields (age, years active) that are always current and never hand-copied
// (our unfair advantage over fandom's hand-duplicated, drifting infoboxes). Every row
// is marked auto = derived from data. Absent data -> the row is omitted (honest
// emptiness, min-gate), never faked.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageRow } from './types';

// F2 A2: each row carries a stable key. `auto` = a COMPUTED field (age, years active) - LOCKED,
// never editable. `editable` rows can carry a per-field curator OVERRIDE (Data -> Edited grammar);
// `edited` marks that an override is in force. Overrides ride the page body jsonb (no schema
// change), so a typed fact can never silently contradict the DB.
export interface FactRow { key: string; dt: string; dd: string; auto?: boolean; editable?: boolean; edited?: boolean }
export interface FactSection { heading: string; rows: FactRow[] }
export interface FactOverrides { fields?: Record<string, string>; photo?: string }
/** The editable (non-computed) fact keys - the only ones a curator override may touch. */
export const EDITABLE_FACT_KEYS = ['name', 'from', 'positions', 'debut', 'fandom'] as const;

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
 * (member pages); other kinds return null until their builders land (flagged). `ov` applies
 * per-field curator overrides (A2) on the editable rows; computed rows are never overridden. */
export async function buildFactRail(db: SupabaseClient, page: PageRow, now: Date, ov?: FactOverrides): Promise<FactSection[] | null> {
  if (page.entity_kind !== 'idol' || page.entity_id == null) return null;
  const fields = ov?.fields ?? {};
  const row = (key: string, dt: string, baseDd: string, opts?: { auto?: boolean }): FactRow => {
    const editable = !opts?.auto && (EDITABLE_FACT_KEYS as readonly string[]).includes(key);
    const overridden = editable && typeof fields[key] === 'string' && fields[key]!.trim() !== '';
    return { key, dt, dd: overridden ? fields[key]! : baseDd, ...(opts?.auto ? { auto: true } : {}), ...(editable ? { editable: true } : {}), ...(overridden ? { edited: true } : {}) };
  };

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
  if (i.name) personal.push(row('name', 'Name', i.name));
  const born = fmtDate(i.birth_date);
  const age = yearsBetween(i.birth_date, now);
  if (born) personal.push(row('born', 'Born', age != null ? `${born} (age ${age})` : born, { auto: age != null }));  // computed -> LOCKED
  if (i.nationality) personal.push(row('from', 'From', i.nationality));
  if (personal.length) sections.push({ heading: 'Personal', rows: personal });

  // Group
  if (g) {
    const grp: FactRow[] = [];
    const debut = fmtDate(g.inception_date);
    const active = yearsBetween(g.inception_date, now);
    if (debut) grp.push(row('debut', 'Debut', debut));
    if (active != null) grp.push(row('years', 'Years active', `${active} years`, { auto: true }));  // computed -> LOCKED
    const pos = (i.positions ?? []).filter(Boolean);
    if (pos.length) grp.push(row('positions', 'Positions', pos.join(', ')));
    if (g.fandom_name) grp.push(row('fandom', 'Fandom', g.fandom_name));
    if (grp.length) sections.push({ heading: g.name, rows: grp });
  }

  return sections.length ? sections : null;
}
