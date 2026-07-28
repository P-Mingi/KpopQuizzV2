// Idol detail read model. Every fact carries provenance: an entity_sources row
// means it was ingested (badge [wd]); an entity_overrides row means a curator set
// it and it WINS at read (badge [cur]). There is deliberately no weight field and
// no personal-life field anywhere in the selection.
import { createPublicReadClient } from '@/lib/supabase/server';
import { idolSlug } from './slug';

export interface IdolFact { field: string; label: string; value: string; source: 'wd' | 'cur' | null; }
export interface IdolDetail {
  group: { id: number; name: string; slug: string; fandom_name: string; display_color: string | null; text_color: string | null; logo_url: string | null };
  id: number; name: string; name_hangul: string | null; name_romanized: string | null;
  positions: string[]; photo_url: string | null; birth_date: string | null; unitName: string | null;
  facts: IdolFact[];
  bandmates: { name: string; slug: string; photo_url: string | null }[];
}

function fmtDate(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y) return d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m ?? 1) - 1]} ${day}, ${y}`;
}

export async function getIdol(groupSlug: string, idolSlugParam: string): Promise<IdolDetail | null> {
  const db = createPublicReadClient();
  const { data: group } = await db
    .from('groups')
    .select('id, name, slug, fandom_name, display_color, text_color, logo_url')
    .eq('slug', groupSlug).maybeSingle();
  if (!group) return null;

  const { data: idols } = await db
    .from('idols')
    .select('id, name, name_hangul, name_romanized, positions, photo_url, birth_date, nationality, height_cm, blood_type, mbti, unit_id')
    .eq('group_id', group.id).eq('active', true);
  const rows = (idols ?? []) as Array<{ id: number; name: string; name_hangul: string | null; name_romanized: string | null; positions: string[] | null; photo_url: string | null; birth_date: string | null; nationality: string | null; height_cm: number | null; blood_type: string | null; mbti: string | null; unit_id: number | null }>;
  const idol = rows.find((r) => idolSlug(r.name) === idolSlugParam);
  if (!idol) return null;

  const [{ data: sources }, { data: overrides }, { data: units }] = await Promise.all([
    db.from('entity_sources').select('field, source').eq('entity_type', 'idol').eq('entity_id', String(idol.id)),
    db.from('entity_overrides').select('field, value').eq('entity_type', 'idol').eq('entity_id', String(idol.id)),
    idol.unit_id ? db.from('group_units').select('id, name').eq('id', idol.unit_id) : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);
  const srcFields = new Set(((sources ?? []) as { field: string }[]).map((s) => s.field));
  const ovMap = new Map(((overrides ?? []) as { field: string; value: string | null }[]).map((o) => [o.field, o.value]));

  // Badge: override present -> [cur]; else ingested -> [wd]; else curator-typed field with a value -> [cur].
  const badge = (field: string, curatorField: boolean): 'wd' | 'cur' | null =>
    ovMap.has(field) ? 'cur' : (srcFields.has(field) ? 'wd' : (curatorField ? 'cur' : null));
  const val = (field: string, ingested: string | null): string | null => (ovMap.has(field) ? (ovMap.get(field) ?? null) : ingested);

  const facts: IdolFact[] = [];
  const born = val('birth_date', idol.birth_date);
  if (born) facts.push({ field: 'birth_date', label: 'Born', value: fmtDate(born), source: badge('birth_date', false) });
  const nat = val('nationality', idol.nationality);
  if (nat) facts.push({ field: 'nationality', label: 'Nationality', value: nat, source: badge('nationality', false) });
  const height = val('height_cm', idol.height_cm != null ? String(idol.height_cm) : null);
  if (height) facts.push({ field: 'height_cm', label: 'Height', value: `${height} cm`, source: badge('height_cm', true) });
  const blood = val('blood_type', idol.blood_type);
  if (blood) facts.push({ field: 'blood_type', label: 'Blood type', value: blood, source: badge('blood_type', true) });
  const mbti = val('mbti', idol.mbti);
  if (mbti) facts.push({ field: 'mbti', label: 'MBTI', value: mbti, source: badge('mbti', true) });
  // NOTE: no weight, ever. No personal-life fields exist in the schema or here.

  const unitName = idol.unit_id ? ((units ?? []) as { id: number; name: string }[]).find((u) => u.id === idol.unit_id)?.name ?? null : null;
  const bandmates = rows.filter((r) => r.id !== idol.id).slice(0, 6).map((r) => ({ name: r.name, slug: idolSlug(r.name), photo_url: r.photo_url }));

  return {
    group,
    id: idol.id, name: idol.name, name_hangul: idol.name_hangul, name_romanized: idol.name_romanized,
    positions: idol.positions ?? [], photo_url: idol.photo_url, birth_date: idol.birth_date, unitName,
    facts, bandmates,
  };
}
