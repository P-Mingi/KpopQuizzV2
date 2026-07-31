// Typed infobox fields per entity type. This registry IS the structural
// living-persons boundary: only these whitelisted, typed fact fields are
// editable. There is deliberately no weight and no personal-life field (dating,
// family, residence, etc.), so the infobox form cannot introduce excluded
// content. Facts are typed (never free text): enums, dates, numbers.
export type FieldType = 'date' | 'text' | 'number' | 'enum';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];   // enum
  min?: number; max?: number; unit?: string; // number
  placeholder?: string;
}

export const INFOBOX_FIELDS: Record<string, FieldDef[]> = {
  idol: [
    { key: 'birth_date', label: 'Born', type: 'date' },
    { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. South Korea' },
    { key: 'height_cm', label: 'Height', type: 'number', min: 120, max: 220, unit: 'cm' },
    { key: 'blood_type', label: 'Blood type', type: 'enum', options: ['A', 'B', 'O', 'AB'] },
    { key: 'mbti', label: 'MBTI', type: 'enum', options: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] },
  ],
  group: [
    { key: 'inception_date', label: 'Debut date', type: 'date' },
    { key: 'record_label', label: 'Record label', type: 'text' },
    { key: 'origin_country', label: 'Origin country', type: 'text' },
    { key: 'official_website', label: 'Official website', type: 'text', placeholder: 'https://...' },
  ],
  // V4 Part 1 item 4 (parity law): the deck's play affordance ships with its
  // curator control. A curated official YouTube link overrides the default
  // 30-second preview per track; no audio uploads exist or ever will.
  song: [
    { key: 'youtube_url', label: 'Official video (YouTube)', type: 'text', placeholder: 'https://www.youtube.com/watch?v=...' },
  ],
};

export function fieldDef(entityType: string, key: string): FieldDef | null {
  return (INFOBOX_FIELDS[entityType] ?? []).find((f) => f.key === key) ?? null;
}

/** Structural gate: is this a whitelisted, editable fact field for this entity type? */
export function isEditableField(entityType: string, key: string): boolean {
  return fieldDef(entityType, key) != null;
}

/** Validate a value against its field type. Returns a normalized value or an error. */
export function validateFieldValue(def: FieldDef, raw: string): { value: string } | { error: string } {
  const v = raw.trim();
  if (v === '') return { value: '' }; // empty = clear (handled as delete upstream)
  switch (def.type) {
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Date must be YYYY-MM-DD' };
      return { value: v };
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return { error: 'Must be a number' };
      if (def.min != null && n < def.min) return { error: `Must be >= ${def.min}` };
      if (def.max != null && n > def.max) return { error: `Must be <= ${def.max}` };
      return { value: String(Math.round(n)) };
    }
    case 'enum':
      if (!(def.options ?? []).includes(v)) return { error: `Must be one of ${def.options?.join(', ')}` };
      return { value: v };
    default:
      return { value: v.slice(0, 200) };
  }
}
