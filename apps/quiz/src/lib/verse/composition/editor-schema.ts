// V-BUILDER-3 step 1 - THE EDITOR SCHEMA FOUNDATION (owner directives D1 + D2).
// Every block becomes editable in DEPTH: a BlockSpec gains an editorSchema - typed
// field definitions the future CONTENT tab (co-design 7, step 2) renders generic
// editors from, and the SOURCE OF TRUTH the validator clamps a block's content
// payload against. This module is DATA + a pure clamp; it renders no UI and changes
// no rendered page (schemas ride alongside the specs; the props clamp only tightens
// what a block may store, never what today's real configs contain).
//
// A field's kind says HOW it is edited; its binding says WHERE the value comes from:
//   curator  - authored + stored in the block's props (the editor writes it)
//   entity   - the real entity data (edited through the entity rails, with provenance);
//              per-row overrides still land in props
//   derived  - auto-derived from data, with an optional per-field curator OVERRIDE in props
// The real-data law holds: entity/derived fields never fabricate; a curator override
// replaces a derived default, it does not invent one.

export type EditorFieldKind =
  | 'text'       // single-line plain text
  | 'richtext'   // TipTap JSON prose (the existing section-editor pipeline / sanitizer)
  | 'image'      // an image asset ref - our ingest-copied storage path, NEVER an external URL (L-047)
  | 'url'        // an external https URL (a video/social link)
  | 'link'       // a site-relative or own-origin href (the anchor rules apply at render)
  | 'entityRef'  // a reference to a real entity (member/album/era/...) by id or slug
  | 'enum'       // exactly one of a fixed option set
  | 'number'     // a bounded integer
  | 'date'       // an ISO date string
  | 'list';      // repeatable rows, each shaped by `item`

export type EditorFieldBinding = 'curator' | 'entity' | 'derived';

export interface EditorField {
  key: string;                 // props key (curator/derived override) or entity field (entity)
  kind: EditorFieldKind;
  label: string;               // curator-facing
  help?: string;               // one-line hint for the field editor
  binding: EditorFieldBinding;
  required?: boolean;          // a curator field that must be present when the block is used
  maxLength?: number;          // text / url / link / entityRef char cap
  min?: number;                // number lower bound
  max?: number;                // number upper bound
  maxItems?: number;           // list row cap
  options?: readonly string[]; // enum values
  entityKind?: string;         // entityRef target kind
  item?: EditorField[];        // list row shape (kind === 'list')
  clampNote?: string;          // the exact human sentence emitted when this field is over-limit
}

export interface EditorSchema {
  block: string;               // the block / editor id
  title: string;               // editor title (curator-facing)
  summary: string;             // one line: what this editor edits
  fields: EditorField[];
  note?: string;               // provenance / law note (e.g. entity-backed, ingest-copy)
}

// ------------------------------------------------------------------ wave 1 schemas
// The nine the owner named (D1/D2). Six ride existing BlockSpecs (vitals, members,
// stats=DATA, timeline, quote, doorway); three (hero, image, youtube) are authored
// here now but have no placeable BlockSpec yet - their blocks + editors land in
// steps 5/6, so they never appear in the Phase-2 library. See the block inventory.

const QUOTE_MAX = 280;   // matches the existing validator cap (lyric-reproduction guard)

export const EDITOR_SCHEMAS: Record<string, EditorSchema> = {
  // hero / identity (D2) - block pending (step 5). The display name stays the page H1.
  hero: {
    block: 'hero', title: 'Header & identity', summary: 'The banner, profile picture, and header text.',
    note: 'Images are ingest-copied to our storage (L-047). Auto-derived chips (member count, fandom) stay data-driven with a per-field override. The display name remains the single page H1; hero semantics do not change.',
    fields: [
      { key: 'banner', kind: 'image', label: 'Banner image', binding: 'curator', help: 'Wide header image (optional).' },
      { key: 'avatar', kind: 'image', label: 'Profile picture', binding: 'curator' },
      { key: 'displayName', kind: 'text', label: 'Display name', binding: 'derived', maxLength: 80, help: 'Overrides the space name in the header (the page H1).' },
      { key: 'tagline', kind: 'text', label: 'Tagline', binding: 'curator', maxLength: 160 },
      { key: 'chips', kind: 'list', label: 'Vitals chips', binding: 'derived', maxItems: 6,
        help: 'The header vitals line; each chip overrides a derived value.',
        item: [
          { key: 'label', kind: 'text', label: 'Label', binding: 'curator', maxLength: 40 },
          { key: 'value', kind: 'text', label: 'Value', binding: 'curator', maxLength: 60, required: true },
        ] },
    ],
  },

  // vitals bar (D1) - "Debut 2013 · 7 members · Columbia Records · ARMY". Chips editable per item.
  vitals: {
    block: 'vitals', title: 'Vitals bar', summary: 'The one-line vitals chips.',
    note: 'Chips default from the entity (debut year, member count, label, fandom). A chip override replaces the derived value; an empty list keeps the derived bar. seoCritical: the bar always renders for a real entity.',
    fields: [
      { key: 'chips', kind: 'list', label: 'Chips', binding: 'derived', maxItems: 6,
        item: [
          { key: 'label', kind: 'text', label: 'Label', binding: 'curator', maxLength: 40 },
          { key: 'value', kind: 'text', label: 'Value', binding: 'curator', maxLength: 60, required: true },
        ] },
    ],
  },

  // members (D1, the flagship) - reorder rows, per-row photo/name/link overrides.
  members: {
    block: 'members', title: 'Members', summary: 'The member roster: photo, name, link per member.',
    note: 'Rows come from the entity roster (order = list order). Adding a member auto-creates its member page via the entity rails; removing detaches (the entity survives - real-data law). Photo/name/link are per-row overrides; absent = the entity value.',
    fields: [
      { key: 'rows', kind: 'list', label: 'Members', binding: 'entity', maxItems: 40,
        item: [
          { key: 'member', kind: 'entityRef', label: 'Member', binding: 'entity', entityKind: 'member', required: true },
          { key: 'photo', kind: 'image', label: 'Photo', binding: 'curator' },
          { key: 'name', kind: 'text', label: 'Name', binding: 'curator', maxLength: 60 },
          { key: 'link', kind: 'link', label: 'Link', binding: 'curator', maxLength: 200 },
        ] },
    ],
  },

  // data block (D1, "IN NUMBERS" renamed DATA) - label + value + source per row.
  stats: {
    block: 'stats', title: 'Data (In numbers)', summary: 'A band of label + value stats, each with a source.',
    note: 'Honest-zeros law: a real zero is shown, never hidden or faked. Every row should carry a source.',
    fields: [
      { key: 'rows', kind: 'list', label: 'Stats', binding: 'curator', maxItems: 12,
        item: [
          { key: 'label', kind: 'text', label: 'Label', binding: 'curator', maxLength: 40, required: true },
          { key: 'value', kind: 'text', label: 'Value', binding: 'curator', maxLength: 24, required: true },
          { key: 'source', kind: 'url', label: 'Source', binding: 'curator', maxLength: 300 },
        ] },
    ],
  },

  // timeline (D1) - era rows: date, title, text, image.
  timeline: {
    block: 'timeline', title: 'Timeline', summary: 'Era rows: date, title, text, image.',
    note: 'Entity eras are the default spine; curator rows extend it. seoCritical: the timeline renders for a real entity.',
    fields: [
      { key: 'rows', kind: 'list', label: 'Eras', binding: 'entity', maxItems: 60,
        item: [
          { key: 'date', kind: 'date', label: 'Date', binding: 'curator' },
          { key: 'title', kind: 'text', label: 'Title', binding: 'curator', maxLength: 80, required: true },
          { key: 'text', kind: 'text', label: 'Note', binding: 'curator', maxLength: 400 },
          { key: 'image', kind: 'image', label: 'Image', binding: 'curator' },
        ] },
    ],
  },

  // quote (D1) - reproduces the existing validator cap + the lyric-reproduction guard.
  quote: {
    block: 'quote', title: 'Quote', summary: 'A fan-written pull-quote (no lyrics).',
    fields: [
      { key: 'text', kind: 'text', label: 'Quote', binding: 'curator', required: true, maxLength: QUOTE_MAX,
        clampNote: `Quote is too long (max ${QUOTE_MAX} characters). Song lyrics cannot be reproduced - link out instead.` },
      { key: 'attribution', kind: 'text', label: 'Attribution', binding: 'curator', maxLength: 80 },
    ],
  },

  // doorway (D1) - the per-door editor. The doorway CONFIG lives in presentation.doorways
  // (validated there); this schema documents the door editor's fields. The crawlable href +
  // target title never change with format (the SEO invariant lives in <DoorwayList>).
  doorway: {
    block: 'doorway', title: 'Doorway', summary: 'A link into another page: target, format, label.',
    note: 'Stored in presentation.doorways (not module props); validated by the doorways clamp. Format is a skin only - the href + target title are invariant.',
    fields: [
      { key: 'target', kind: 'entityRef', label: 'Target', binding: 'entity', required: true, help: 'A known doorway id.' },
      { key: 'format', kind: 'enum', label: 'Format', binding: 'curator', options: ['link', 'button', 'card', 'feature'] },
      { key: 'label', kind: 'text', label: 'Label', binding: 'curator', maxLength: 60 },
      { key: 'collapsed', kind: 'enum', label: 'Collapsed', binding: 'curator', options: ['no', 'yes'] },
    ],
  },

  // image (D1) - block pending (step 6). Ingest-copied storage only; alt REQUIRED.
  image: {
    block: 'image', title: 'Image', summary: 'A single image with alt text, caption, and an optional link.',
    note: 'The source is ingest-COPIED into our storage (L-047) - an external URL is never rendered. Alt text is required (accessibility + honest description).',
    fields: [
      { key: 'src', kind: 'image', label: 'Image', binding: 'curator', required: true },
      { key: 'alt', kind: 'text', label: 'Alt text', binding: 'curator', required: true, maxLength: 160 },
      { key: 'caption', kind: 'text', label: 'Caption', binding: 'curator', maxLength: 200 },
      { key: 'link', kind: 'link', label: 'Link', binding: 'curator', maxLength: 200 },
      { key: 'size', kind: 'enum', label: 'Size', binding: 'curator', options: ['S', 'M', 'L'] },
    ],
  },

  // youtube embed (D1) - block pending (step 6). Click-to-load facade; title fetched honestly.
  youtube: {
    block: 'youtube', title: 'YouTube', summary: 'An official YouTube video, click-to-load.',
    note: 'A click-to-load facade (no auto-embed). The title is fetched honestly from the video, never fabricated.',
    fields: [
      { key: 'url', kind: 'url', label: 'Video URL', binding: 'curator', required: true, maxLength: 300 },
      { key: 'title', kind: 'text', label: 'Title', binding: 'derived', maxLength: 160 },
      { key: 'start', kind: 'number', label: 'Start (seconds)', binding: 'curator', min: 0, max: 86400 },
    ],
  },
};

export function editorSchema(type: string): EditorSchema | null {
  return Object.prototype.hasOwnProperty.call(EDITOR_SCHEMAS, type) ? EDITOR_SCHEMAS[type]! : null;
}
export function hasEditorSchema(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(EDITOR_SCHEMAS, type);
}

// ------------------------------------------------------------ the content-payload clamp
// Clamp a block's raw props against its schema. Returns the normalized props (only the
// schema's curator/derived-override fields, coerced + bounded) and a list of human
// sentences for anything a curator must fix. entity-bound fields are edited through the
// entity rails, not stored in props, so they are ignored here EXCEPT inside list rows
// (a row's per-row overrides ride props). Unknown props keys are dropped silently.
// This runs on every save + publish (via the presentation validator).

const URLish = (s: string): boolean => { try { return new URL(s).protocol === 'https:'; } catch { return false; } };
const linkish = (s: string): boolean => s.startsWith('/') || URLish(s);
// an ingest-copied asset ref or storage path (the real ingest-copy is enforced in step 3;
// here we only reject an obvious external URL so a hostile props can never smuggle one in).
const assetish = (s: string): boolean => !/^https?:\/\//i.test(s);

function clampField(field: EditorField, raw: unknown, errors: string[]): unknown {
  const label = field.label;
  switch (field.kind) {
    case 'text': {
      if (typeof raw !== 'string') return undefined;
      const v = raw.trim();
      if (!v) return undefined;
      if (field.maxLength && v.length > field.maxLength) {
        // A clampNote marks a HARD cap (e.g. the quote lyric-reproduction guard): over-limit
        // is a human sentence + reject. Otherwise a plain text field silently clamps to the
        // cap (matches the legacy attribution/title behavior - never rejects a near-valid save).
        if (field.clampNote) { errors.push(field.clampNote); return undefined; }
        return v.slice(0, field.maxLength);
      }
      return v;
    }
    case 'url': {
      if (typeof raw !== 'string' || !raw.trim()) return undefined;
      const v = raw.trim().slice(0, field.maxLength ?? 500);
      if (!URLish(v)) { errors.push(`${label} must be a valid https link.`); return undefined; }
      return v;
    }
    case 'link': {
      if (typeof raw !== 'string' || !raw.trim()) return undefined;
      const v = raw.trim().slice(0, field.maxLength ?? 500);
      if (!linkish(v)) { errors.push(`${label} must be a site link or an https URL.`); return undefined; }
      return v;
    }
    case 'image': {
      if (typeof raw !== 'string' || !raw.trim()) return undefined;
      const v = raw.trim().slice(0, 400);
      if (!assetish(v)) { errors.push(`${label} must be an uploaded image, not an external URL (we copy images into our own storage).`); return undefined; }
      return v;
    }
    case 'enum': {
      const v = String(raw ?? '');
      if (!field.options || !field.options.includes(v)) { if (raw != null && raw !== '') errors.push(`${label} must be one of: ${(field.options ?? []).join(', ')}.`); return undefined; }
      return v;
    }
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) { if (raw != null && raw !== '') errors.push(`${label} must be a number.`); return undefined; }
      if (field.min != null && n < field.min) { errors.push(`${label} must be at least ${field.min}.`); return undefined; }
      if (field.max != null && n > field.max) { errors.push(`${label} must be at most ${field.max}.`); return undefined; }
      return Math.round(n);
    }
    case 'date': {
      if (typeof raw !== 'string' || !raw.trim()) return undefined;
      const t = Date.parse(raw);
      if (!Number.isFinite(t)) { errors.push(`${label} must be a valid date.`); return undefined; }
      return new Date(t).toISOString();
    }
    case 'entityRef': {
      if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
      const v = String(raw).trim().slice(0, field.maxLength ?? 120);
      return v || undefined;
    }
    case 'richtext': {
      // the TipTap doc object; the render sink (renderTipTapJSON) sanitizes it. Here we
      // only accept the object shape - deep content sanitization is the sink's job.
      return raw && typeof raw === 'object' ? raw : undefined;
    }
    case 'list': {
      if (!Array.isArray(raw) || !field.item) return undefined;
      const cap = field.maxItems ?? 24;
      if (raw.length > cap) errors.push(`${label} has too many rows (max ${cap}).`);
      const rows = raw.slice(0, cap).map((row) => {
        if (row == null || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        const outRow: Record<string, unknown> = {};
        for (const f of field.item!) {
          const cv = clampField(f, r[f.key], errors);
          if (cv !== undefined) outRow[f.key] = cv;
        }
        return Object.keys(outRow).length ? outRow : null;
      }).filter(Boolean);
      return rows.length ? rows : undefined;
    }
    default:
      return undefined;
  }
}

/** Clamp ONE field's raw value: returns the normalized value (undefined if empty/dropped)
 * and the human sentence to render under it (undefined if clean). The content tab uses this
 * for inline per-field validation; the server validator uses the whole-props clamp below. */
export function validateField(field: EditorField, raw: unknown): { value?: unknown; error?: string | undefined } {
  const errors: string[] = [];
  const value = clampField(field, raw, errors);
  return { value, error: errors[0] };
}

export interface PropsClampResult { props?: Record<string, unknown>; errors: string[] }

/** Clamp raw block props against the block's editor schema. Pure; no I/O. */
export function clampPropsBySchema(schema: EditorSchema, raw: unknown): PropsClampResult {
  const errors: string[] = [];
  if (raw == null || typeof raw !== 'object') return { errors };
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of schema.fields) {
    // top-level entity refs are edited via the entity rails, not stored in props; skip
    // them here (list rows still clamp their per-row overrides inside clampField).
    if (field.binding === 'entity' && field.kind !== 'list') continue;
    const cv = clampField(field, p[field.key], errors);
    if (cv !== undefined) out[field.key] = cv;
  }
  // `required` is UI metadata (the content tab enforces it): the validator only CLAMPS
  // hostile values, it never rejects an incomplete save, so a not-yet-finished block can
  // always be saved as a draft. Hostile values (over a hard cap, bad enum/url/external
  // image) still push their human sentence above and revert the save.
  return Object.keys(out).length ? { props: out, errors } : { errors };
}
