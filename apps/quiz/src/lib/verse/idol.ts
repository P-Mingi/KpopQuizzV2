// Idol detail read model. Every fact carries provenance: an entity_sources row
// means it was ingested (badge [wd]); an entity_overrides row means a curator set
// it and it WINS at read (badge [cur]). There is deliberately no weight field and
// no personal-life field anywhere in the selection.
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { idolSlug } from './slug';
import { INFOBOX_FIELDS } from './fields';

export interface IdolFact { field: string; label: string; value: string; source: 'wd' | 'cur' | null; sourceUrl?: string | null; }
export interface EditableField { key: string; value: string; sourceUrl: string; isOverride: boolean; }
export interface IdolFanStats {
  // "What fans know" - real per-idol fan behavior. Each is null when below its
  // gate; the block hides when all are null. Never zero-padded, never faked.
  biasCount: number | null;            // fans who bias this idol (gate >= 3)
  personalityRank: number | null;      // most-gotten personality match rank (gate: group >= 20 results)
  personalityGroupTotal: number;       // group's total personality results (for the gate + honesty)
  nameRecognitionPct: number | null;   // % of name-all rounds that named this idol (gate: group >= 30 rounds)
  nameRounds: number;                  // group's total name-all rounds (for the "from N rounds" label)
}
export interface IdolDetail {
  group: { id: number; name: string; slug: string; fandom_name: string; display_color: string | null; text_color: string | null; logo_url: string | null; inception_date: string | null };
  id: number; name: string; name_hangul: string | null; name_romanized: string | null;
  positions: string[]; photo_url: string | null; birth_date: string | null; unitName: string | null;
  facts: IdolFact[];
  editableFields: EditableField[];
  bandmates: { name: string; slug: string; photo_url: string | null }[];
  fanStats: IdolFanStats;
}

const BIAS_GATE = 3;
const PERSONALITY_GROUP_GATE = 20;
const NAME_ROUNDS_GATE = 30;

function fmtDate(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y) return d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m ?? 1) - 1]} ${day}, ${y}`;
}

export async function getIdol(groupSlug: string, idolSlugParam: string): Promise<IdolDetail | null> {
  const db = createPublicReadClient();
  const { data: group, error: gErr } = await db
    .from('groups')
    .select('id, name, slug, fandom_name, display_color, text_color, logo_url, inception_date')
    .eq('slug', groupSlug).maybeSingle();
  // ISR bake law: both reads define the member page. Throw on error so a
  // transient failure does not bake a notFound() over a real idol.
  if (gErr) throw new Error(`getIdol(${groupSlug}): group read: ${gErr.message}`);
  if (!group) return null;

  const { data: idols, error: iErr } = await db
    .from('idols')
    .select('id, name, name_hangul, name_romanized, positions, photo_url, birth_date, nationality, height_cm, blood_type, mbti, unit_id')
    .eq('group_id', group.id).eq('active', true);
  if (iErr) throw new Error(`getIdol(${groupSlug}): idols read: ${iErr.message}`);
  const rows = (idols ?? []) as Array<{ id: number; name: string; name_hangul: string | null; name_romanized: string | null; positions: string[] | null; photo_url: string | null; birth_date: string | null; nationality: string | null; height_cm: number | null; blood_type: string | null; mbti: string | null; unit_id: number | null }>;
  const idol = rows.find((r) => idolSlug(r.name) === idolSlugParam);
  if (!idol) return null;

  const [{ data: sources }, { data: overrides }, { data: units }] = await Promise.all([
    db.from('entity_sources').select('field, source').eq('entity_type', 'idol').eq('entity_id', String(idol.id)),
    db.from('entity_overrides').select('field, value, source_url').eq('entity_type', 'idol').eq('entity_id', String(idol.id)),
    idol.unit_id ? db.from('group_units').select('id, name').eq('id', idol.unit_id) : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);
  const srcFields = new Set(((sources ?? []) as { field: string }[]).map((s) => s.field));
  const ovMap = new Map(((overrides ?? []) as { field: string; value: string | null; source_url: string | null }[]).map((o) => [o.field, o]));

  // Badge: override present -> [cur]; else ingested -> [wd]; else curator-typed field with a value -> [cur].
  const badge = (field: string, curatorField: boolean): 'wd' | 'cur' | null =>
    ovMap.has(field) ? 'cur' : (srcFields.has(field) ? 'wd' : (curatorField ? 'cur' : null));
  const val = (field: string, ingested: string | null): string | null => (ovMap.has(field) ? (ovMap.get(field)?.value ?? null) : ingested);
  const src = (field: string): string | null => ovMap.get(field)?.source_url ?? null;

  const facts: IdolFact[] = [];
  const born = val('birth_date', idol.birth_date);
  if (born) facts.push({ field: 'birth_date', label: 'Born', value: fmtDate(born), source: badge('birth_date', false), sourceUrl: src('birth_date') });
  const nat = val('nationality', idol.nationality);
  if (nat) facts.push({ field: 'nationality', label: 'Nationality', value: nat, source: badge('nationality', false), sourceUrl: src('nationality') });
  const height = val('height_cm', idol.height_cm != null ? String(idol.height_cm) : null);
  if (height) facts.push({ field: 'height_cm', label: 'Height', value: `${height} cm`, source: badge('height_cm', true), sourceUrl: src('height_cm') });
  const blood = val('blood_type', idol.blood_type);
  if (blood) facts.push({ field: 'blood_type', label: 'Blood type', value: blood, source: badge('blood_type', true), sourceUrl: src('blood_type') });
  const mbti = val('mbti', idol.mbti);
  if (mbti) facts.push({ field: 'mbti', label: 'MBTI', value: mbti, source: badge('mbti', true), sourceUrl: src('mbti') });
  // NOTE: no weight, ever. No personal-life fields exist in the schema or here.

  // Editable field rows for the infobox editor (whitelist only, current values).
  const ingestedByKey: Record<string, string | null> = {
    birth_date: idol.birth_date, nationality: idol.nationality,
    height_cm: idol.height_cm != null ? String(idol.height_cm) : null,
    blood_type: idol.blood_type, mbti: idol.mbti,
  };
  const editableFields: EditableField[] = (INFOBOX_FIELDS.idol ?? []).map((f) => {
    const ov = ovMap.get(f.key);
    return { key: f.key, value: (ov ? ov.value : ingestedByKey[f.key]) ?? '', sourceUrl: ov?.source_url ?? '', isOverride: !!ov };
  });

  const unitName = idol.unit_id ? ((units ?? []) as { id: number; name: string }[]).find((u) => u.id === idol.unit_id)?.name ?? null : null;
  const bandmates = rows.filter((r) => r.id !== idol.id).slice(0, 6).map((r) => ({ name: r.name, slug: idolSlug(r.name), photo_url: r.photo_url }));

  // ---- WHAT FANS KNOW: real per-idol fan behavior (min-gated, never faked) ----
  // Aggregates are computed with the service-role client: personality_results is
  // not anon-readable under RLS, and only the resulting count/rank is rendered -
  // never any per-row or user data. No PII leaves the server.
  const svc = createServiceRoleClient();
  const [{ data: biasRows }, { data: persRows }, { data: nameRec }] = await Promise.all([
    // Fans who bias this idol. Match the free-text bias (case-insensitive), then
    // disambiguate cross-group name collisions with ult_groups: a bias counts if
    // the fan set no ult group, or lists this idol's group.
    svc.from('profiles').select('ult_groups').ilike('bias', idol.name),
    svc.from('personality_results').select('member_name').eq('group_id', group.id),
    // Aggregate name-all recognition (SECURITY DEFINER RPC; no raw rows exposed).
    svc.rpc('verse_name_recognition', { p_group_id: group.id }),
  ]);
  const norm = (s: string): string => s.toLowerCase().trim();
  const biasHits = ((biasRows ?? []) as { ult_groups: string[] | null }[])
    .filter((r) => !r.ult_groups || r.ult_groups.length === 0 || r.ult_groups.includes(group.slug)).length;
  const biasCount = biasHits >= BIAS_GATE ? biasHits : null;

  const persTally = new Map<string, number>();
  for (const r of (persRows ?? []) as { member_name: string }[]) {
    const k = norm(r.member_name || '');
    if (k) persTally.set(k, (persTally.get(k) ?? 0) + 1);
  }
  const personalityGroupTotal = (persRows ?? []).length;
  const myCount = persTally.get(norm(idol.name)) ?? 0;
  const rank = 1 + [...persTally.values()].filter((c) => c > myCount).length;
  const personalityRank = (personalityGroupTotal >= PERSONALITY_GROUP_GATE && myCount > 0) ? rank : null;

  const nameRows = (nameRec ?? []) as { member_name: string; found_pct: number; samples: number; rounds: number }[];
  const nameRounds = Number(nameRows[0]?.rounds ?? 0);
  const myRec = nameRows.find((r) => norm(r.member_name) === norm(idol.name));
  const nameRecognitionPct = (nameRounds >= NAME_ROUNDS_GATE && myRec) ? Number(myRec.found_pct) : null;

  return {
    group,
    id: idol.id, name: idol.name, name_hangul: idol.name_hangul, name_romanized: idol.name_romanized,
    positions: idol.positions ?? [], photo_url: idol.photo_url, birth_date: idol.birth_date, unitName,
    facts, editableFields, bandmates,
    fanStats: { biasCount, personalityRank, personalityGroupTotal, nameRecognitionPct, nameRounds },
  };
}
