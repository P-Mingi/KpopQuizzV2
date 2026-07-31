// V-PAGES validation - every write to verse_pages passes through here (the API
// routes are the only writers; RLS blocks everything else). The gates, unit-
// proven in scripts/test-vpages-gates.mts:
//   1. unknown kind rejected (and, on create, kinds not enabled for the space)
//   2. slug/title shape (mirrors the 140 CHECKs so failures are friendly, not 500s)
//   3. living-persons exclusions on title + slug + every infobox string, EVERY kind
//   4. infobox typed per kind: unknown keys rejected; fact fields are
//      { value, source } and a present value DEMANDS an https source
//   5. ranked: methodology required before the page may leave draft
// Prose bodies are validated on their own rails (banned-terms checkText at save,
// the suggest queue for non-curators); this file owns page METADATA.

import { getKind, kindsForSpace, violatesLivingPersons } from './kinds';

import type { KindRegistry, InfoboxFieldDef } from './kinds';

export type PageStatus = 'draft' | 'review' | 'published';
export const PAGE_STATUSES: PageStatus[] = ['draft', 'review', 'published'];

export interface PageMetaInput {
  kind: string;
  slug: string;
  title: string;
  status: PageStatus | string;
  infobox?: unknown;
  parentPageId?: number | null;
}

export interface PageMetaResult {
  ok: boolean;
  errors: string[];
  /** Sanitized meta (known keys only, trimmed) when ok. */
  value?: { kind: string; slug: string; title: string; status: PageStatus; infobox: Record<string, unknown> };
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTPS_RE = /^https:\/\/[^\s]+$/i;

function checkFieldValue(f: InfoboxFieldDef, raw: unknown, errors: string[]): unknown {
  const plain = typeof raw === 'string' ? raw.trim() : raw;
  switch (f.type) {
    case 'text': {
      if (typeof plain !== 'string') { errors.push(`"${f.label}" must be text.`); return undefined; }
      if (plain.length > 500) { errors.push(`"${f.label}" is too long (max 500 characters).`); return undefined; }
      return plain;
    }
    case 'number': {
      const n = Number(plain);
      if (!Number.isFinite(n)) { errors.push(`"${f.label}" must be a number.`); return undefined; }
      return n;
    }
    case 'year': {
      const n = Number(plain);
      if (!Number.isInteger(n) || n < 1900 || n > 2100) { errors.push(`"${f.label}" must be a year (1900-2100).`); return undefined; }
      return n;
    }
    case 'date': {
      const t = Date.parse(String(plain));
      if (!Number.isFinite(t)) { errors.push(`"${f.label}" must be a valid date.`); return undefined; }
      return new Date(t).toISOString().slice(0, 10);
    }
    case 'url': {
      if (typeof plain !== 'string' || !HTTPS_RE.test(plain) || plain.length > 500) {
        errors.push(`"${f.label}" must be an https link${f.officialOnly ? ' to the OFFICIAL destination' : ''}.`);
        return undefined;
      }
      return plain;
    }
    case 'select': {
      if (typeof plain !== 'string' || !(f.options ?? []).includes(plain)) {
        errors.push(`"${f.label}" must be one of: ${(f.options ?? []).join(', ')}.`);
        return undefined;
      }
      return plain;
    }
  }
}

export function validatePageMeta(
  reg: KindRegistry,
  input: PageMetaInput,
  opts: { forCreate?: boolean; enabledKinds?: string[] | null } = {},
): PageMetaResult {
  const errors: string[] = [];

  // 1. kind
  const def = getKind(reg, input.kind);
  if (!def) return { ok: false, errors: [`Unknown page kind "${input.kind}".`] };
  if (opts.forCreate) {
    const enabled = kindsForSpace(reg, opts.enabledKinds).some((k) => k.kind === def.kind);
    if (!enabled) return { ok: false, errors: [`The "${def.label}" kind is not enabled for this space.`] };
  }

  // 2. slug + title + status (mirror the 140 CHECKs)
  const slug = String(input.slug ?? '').trim();
  const title = String(input.title ?? '').trim();
  if (!SLUG_RE.test(slug) || slug.length > 80) errors.push('Slug must be lowercase letters, numbers and single hyphens (max 80).');
  if (title.length < 1 || title.length > 200) errors.push('Title must be 1-200 characters.');
  const status = String(input.status ?? 'draft') as PageStatus;
  if (!PAGE_STATUSES.includes(status)) errors.push(`Unknown status "${input.status}".`);

  // 3. living-persons structural exclusions: title + slug, every kind
  for (const [what, text] of [['title', title], ['slug', slug]] as const) {
    const hit = violatesLivingPersons(text);
    if (hit) errors.push(`The ${what} touches an excluded topic ("${hit}"). Dating, health, family, residence and rumor content is never allowed.`);
  }

  // 4. infobox: typed per kind, unknown keys rejected, facts demand sources
  const rawBox = (input.infobox && typeof input.infobox === 'object' && !Array.isArray(input.infobox) ? input.infobox : {}) as Record<string, unknown>;
  const byKey = new Map(def.infobox.map((f) => [f.key, f]));
  const box: Record<string, unknown> = {};
  for (const key of Object.keys(rawBox)) {
    const f = byKey.get(key);
    if (!f) { errors.push(`Unknown infobox field "${key}" for the ${def.label} kind.`); continue; }
    const raw = rawBox[key];
    if (raw == null || raw === '') continue; // empty = simply absent

    if (f.fact) {
      // fact = { value, source }; a present value DEMANDS an https source
      const obj = (typeof raw === 'object' && !Array.isArray(raw) ? raw : { value: raw }) as Record<string, unknown>;
      const value = checkFieldValue(f, obj.value, errors);
      if (value === undefined || value === '') continue;
      const source = typeof obj.source === 'string' ? obj.source.trim() : '';
      if (!HTTPS_RE.test(source)) { errors.push(`"${f.label}" is a fact and needs an https source.`); continue; }
      if (typeof value === 'string') {
        const hit = violatesLivingPersons(value);
        if (hit) { errors.push(`"${f.label}" touches an excluded topic ("${hit}").`); continue; }
      }
      box[key] = { value, source };
    } else {
      const value = checkFieldValue(f, raw, errors);
      if (value === undefined || value === '') continue;
      if (typeof value === 'string') {
        const hit = violatesLivingPersons(value);
        if (hit) { errors.push(`"${f.label}" touches an excluded topic ("${hit}").`); continue; }
      }
      box[key] = value;
    }
  }

  // 5. ranked: methodology before leaving draft (no methodology, no publish)
  if (def.requiresMethodology && status !== 'draft') {
    const m = box.methodology;
    const text = typeof m === 'string' ? m : '';
    if (text.trim().length < 40) errors.push('A ranked page needs its methodology (weights, data source, as-of date) before it can leave draft.');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], value: { kind: def.kind, slug, title, status, infobox: box } };
}
