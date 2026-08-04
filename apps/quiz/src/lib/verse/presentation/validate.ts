// W-CUSTOM - server-side config validation (Zod-style, hand-rolled: NO new deps).
// Runs on every save AND publish. Enforces the two laws: the SEO INVARIANT
// (seoCritical blocks cannot be removed or hidden) and the READABILITY GUARDRAIL
// (text/background must pass WCAG AA). Unknown block types are rejected. Every
// failure is a plain human sentence a curator can act on.

import { BLOCK_REGISTRY, isKnownBlock, blockDef, defaultSeoCriticalTypes, FRAME_STYLES } from './registry';
import { PRESETS, STRUCTURE_TEMPLATES, ALLOWED_TABS, STICKER_SLOTS, PRESENTATION_VERSION } from './types';
import { DOORWAY_IDS, DOORWAY_FORMATS, DOORWAY_DEFAULTS, DOORWAY_MAX_LABEL } from './doorways';
import { isHex, accentReadableOn } from './contrast';
import { blockId } from '../composition/convert';
import { clampTint, clampRadius, clampDensity, clampScale, clampAccentKey, clampBlockDivider } from '../composition/block-style';

import type { FrameStyle } from './registry';
import type { Presentation, ModulePlacement, StickerPlacement, StickerSlot, PresetId, BannerConfig } from './types';

export interface ValidationResult {
  ok: boolean;
  value?: Presentation;   // normalized config when ok
  errors: string[];       // human-readable sentences when not
}

const MAX_MODULES = 24;
const MAX_STICKERS = 12;      // page cap (clutter + perf guard)
const MAX_WELCOME = 400;
const MAX_QUOTE = 280;        // pull-quote cap (also a lyric-reproduction guard)
const MIN_TABS = 3;
const MAX_TABS = 7;

// Per-block props validation. Returns {props, errors}. Unknown props are dropped.
function validateProps(type: string, raw: unknown): { props?: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  if (raw == null || typeof raw !== 'object') return { errors };
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (type === 'quote') {
    const text = typeof p.text === 'string' ? p.text.trim() : '';
    if (text.length > MAX_QUOTE) errors.push(`Quote is too long (max ${MAX_QUOTE} characters). Song lyrics cannot be reproduced - link out instead.`);
    if (text) out.text = text.slice(0, MAX_QUOTE);
    if (typeof p.attribution === 'string' && p.attribution.trim()) out.attribution = p.attribution.trim().slice(0, 80);
  } else if (type === 'spotlight') {
    if (p.photocardId != null) { const n = Number(p.photocardId); if (Number.isFinite(n) && n > 0) out.photocardId = n; }
    if (typeof p.kind === 'string' && ['photocard', 'collectible'].includes(p.kind)) out.kind = p.kind;
  } else if (type === 'music') {
    if (typeof p.mode === 'string' && ['youtube', 'audio', 'playlist', 'signature'].includes(p.mode)) out.mode = p.mode;
    for (const k of ['videoId', 'url', 'audioUrl', 'title']) if (typeof p[k] === 'string') out[k] = (p[k] as string).slice(0, 500);
    if (Array.isArray(p.tracks)) {
      out.tracks = p.tracks.slice(0, 12).map((t) => (t && typeof t === 'object'
        ? { title: String((t as Record<string, unknown>).title ?? '').slice(0, 120), url: String((t as Record<string, unknown>).url ?? '').slice(0, 500) }
        : null)).filter(Boolean);
    }
  } else if (type === 'social_embed') {
    if (typeof p.url === 'string') out.url = p.url.slice(0, 500);
  } else if (type === 'discord') {
    if (typeof p.invite === 'string') out.invite = p.invite.slice(0, 200);
    if (typeof p.serverId === 'string') out.serverId = p.serverId.slice(0, 40);
  }
  return Object.keys(out).length ? { props: out, errors } : { errors };
}

// The base page backgrounds an accent must stay readable against (light cream +
// dark). If no shade of the accent can hit AA on BOTH, the config is unreadable.
const BG_LIGHT = '#faf8f5';
const BG_DARK = '#141210';

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Validate + normalize a raw presentation object (from JSON). Pure, no I/O. */
export function validatePresentation(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: ['Presentation config must be an object.'] };
  }
  const c = raw as Record<string, unknown>;

  // version
  if (c.version !== PRESENTATION_VERSION) errors.push(`Unsupported config version (expected ${PRESENTATION_VERSION}).`);

  // preset
  if (c.preset != null && !PRESETS.includes(c.preset as never)) errors.push(`Unknown preset "${String(c.preset)}".`);

  // structure template (V-TEMPLATES)
  if (c.template != null && !STRUCTURE_TEMPLATES.includes(c.template as never)) errors.push(`Unknown structure template "${String(c.template)}".`);

  // accent + READABILITY GUARDRAIL
  let accent: string | null = null;
  if (c.accent != null) {
    if (!isHex(c.accent)) errors.push('Accent color must be a hex value like #7c5cfc.');
    else {
      accent = c.accent as string;
      if (!accentReadableOn(accent, BG_LIGHT) || !accentReadableOn(accent, BG_DARK)) {
        errors.push('That accent color is unreadable on the page background even after shading. Pick a stronger shade.');
      }
    }
  }

  // welcome
  let welcome: string | null = null;
  if (c.welcome != null) {
    if (typeof c.welcome !== 'string') errors.push('Welcome text must be text.');
    else if (c.welcome.length > MAX_WELCOME) errors.push(`Welcome text is too long (max ${MAX_WELCOME} characters).`);
    else welcome = c.welcome;
  }

  // tabs (3-7, subset, must include home, no dupes). Hidden tabs never hide pages.
  let tabs: Presentation['tabs'] | undefined;
  if (c.tabs != null) {
    // Legacy 'quests' picks (pre V-MODES) drop silently, never error: the tab
    // left the reader nav for good and old saved configs must keep re-saving.
    // The MIN check judges the curator's ORIGINAL pick, so our migration can
    // never push a valid old config under the floor and block its saves.
    const raw = asArray(c.tabs).map(String);
    const t = raw.filter((x) => x !== 'quests');
    const bad = t.filter((x) => !ALLOWED_TABS.includes(x as never));
    if (bad.length) errors.push(`Unknown tab(s): ${bad.join(', ')}.`);
    if (new Set(t).size !== t.length) errors.push('Duplicate tabs are not allowed.');
    if (raw.length < MIN_TABS || t.length > MAX_TABS) errors.push(`Pick between ${MIN_TABS} and ${MAX_TABS} tabs.`);
    if (!t.includes('home')) errors.push('The Home tab is required.');
    if (!bad.length) tabs = t as Presentation['tabs'];
  }

  // modules: known types, valid zone, seoCritical cannot be hidden/removed
  let modules: ModulePlacement[] | undefined;
  if (c.modules != null) {
    const rawMods = asArray(c.modules);
    if (rawMods.length > MAX_MODULES) errors.push(`Too many modules (max ${MAX_MODULES}).`);
    const norm: ModulePlacement[] = [];
    const seen = new Set<string>();
    const seenIds = new Set<string>();      // 3.0 duplicate-id gate
    for (const m of rawMods) {
      if (m === null || typeof m !== 'object') { errors.push('Each module must be an object.'); continue; }
      const mm = m as Record<string, unknown>;
      const type = String(mm.type ?? '');
      if (!isKnownBlock(type)) { errors.push(`Unknown block type "${type}".`); continue; }
      const def = blockDef(type)!;
      const zone = String(mm.zone ?? def.defaultZone ?? 'main') as ModulePlacement['zone'];
      if (!def.zones.includes(zone)) { errors.push(`"${def.label}" cannot go in the ${zone} zone.`); continue; }
      if (mm.frame != null && !FRAME_STYLES.includes(mm.frame as never)) { errors.push(`Unknown frame style "${String(mm.frame)}".`); continue; }
      // 3.0 STABLE ID: accept a persisted id (opaque, url-safe, <=64 chars). A blank
      // string is treated as absent (freeze mints it below); a malformed or DUPLICATE
      // id is a hard reject so selection/undo/reconcile can never key on a bad id.
      let id: string | undefined;
      if (mm.id != null && mm.id !== '') {
        if (typeof mm.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(mm.id)) { errors.push(`Invalid block id "${String(mm.id)}".`); continue; }
        if (seenIds.has(mm.id)) { errors.push(`Duplicate block id "${mm.id}".`); continue; }
        seenIds.add(mm.id);
        id = mm.id;
      }
      // THE LAW: seoCritical blocks may not be hidden.
      const hidden = def.seoCritical ? false : mm.hidden === true;
      if (def.seoCritical && mm.hidden === true) errors.push(`"${def.label}" is core content and cannot be hidden.`);
      seen.add(type);
      const placement: ModulePlacement = { type, zone, hidden, order: Number(mm.order ?? norm.length) };
      if (id) placement.id = id;
      if (mm.frame != null) placement.frame = mm.frame as FrameStyle;
      if (mm.mode != null) placement.mode = String(mm.mode);
      // V-BUILDER-2 step 5 - per-block STYLE: every value is a named enum/token key. An
      // unknown value is REJECTED with a human sentence (so the panel reverts), never a
      // raw ghost. Accent additionally accepts a readable clamped hex (L-020).
      if (mm.background != null) { const v = clampTint(mm.background); if (v && v !== 'none') placement.background = v; else if (!v) errors.push(`Unknown background tint "${String(mm.background)}".`); }
      if (mm.radius != null) { const v = clampRadius(mm.radius); if (v) placement.radius = v; else errors.push(`Unknown block radius "${String(mm.radius)}".`); }
      if (mm.density != null) { const v = clampDensity(mm.density); if (v) placement.density = v; else errors.push(`Unknown block density "${String(mm.density)}".`); }
      if (mm.textScale != null) { const v = clampScale(mm.textScale); if (v) placement.textScale = v; else errors.push(`Unknown text scale "${String(mm.textScale)}".`); }
      if (mm.divider != null) { const v = clampBlockDivider(mm.divider); if (v && v !== 'none') placement.divider = v; else if (!v) errors.push(`Unknown block divider "${String(mm.divider)}".`); }
      if (mm.accent != null) {
        const key = clampAccentKey(mm.accent);
        if (key) { if (key !== 'world') placement.accent = key; }
        else if (isHex(mm.accent)) {
          if (accentReadableOn(mm.accent as string, BG_LIGHT) && accentReadableOn(mm.accent as string, BG_DARK)) placement.accent = mm.accent as string;
          else errors.push('That block accent is unreadable on the page background even after shading. Pick a stronger shade.');
        } else errors.push(`Unknown block accent "${String(mm.accent)}".`);
      }
      const pv = validateProps(type, mm.props);
      pv.errors.forEach((e) => errors.push(e));
      if (pv.props) placement.props = pv.props;
      norm.push(placement);
    }
    // THE LAW: no seoCritical default block may be missing from an explicit stack.
    // AUTO-INJECT rather than reject: a config saved before a new core block
    // existed is not a removal attempt, and rejecting it would nuke the curator's
    // whole presentation (the opposite of the law's intent). Injection means the
    // stored config heals and the core content always renders; resolve.ts keeps
    // the same injection as belt-and-suspenders for unvalidated paths.
    for (const req of defaultSeoCriticalTypes()) {
      if (!seen.has(req)) {
        const def = BLOCK_REGISTRY[req]!;
        norm.push({ type: req, zone: def.defaultZone as ModulePlacement['zone'], order: def.defaultOrder, hidden: false });
      }
    }
    // 3.0 FREEZE: mint the deterministic id for any module still without one (legacy
    // configs + the just-injected seoCritical defaults) so THIS save writes the id
    // into the jsonb and it is never re-derived again. nth is counted in the SAME
    // (zone, order) order the converter + renderer use, so a frozen fallback id
    // exactly matches the data-block-id the canvas already stamped.
    const sortedForIds = [...norm].sort((a, b) => (a.zone === b.zone ? a.order - b.order : a.zone < b.zone ? -1 : 1));
    const nthById: Record<string, number> = {};
    for (const m of sortedForIds) {
      const nth = nthById[m.type] ?? 0;
      nthById[m.type] = nth + 1;
      if (!m.id) m.id = blockId(m.type, nth);
    }
    // Belt-and-suspenders: no two blocks (explicit or frozen) may share an id.
    const allIds = norm.map((m) => m.id).filter(Boolean) as string[];
    if (new Set(allIds).size !== allIds.length) errors.push('Two blocks share the same id; each block needs a unique id.');
    if (!errors.length) modules = norm;
  }

  // stickers: cap 12, valid slot + transforms
  let stickers: Presentation['stickers'] | undefined;
  if (c.stickers != null) {
    const raws = asArray(c.stickers);
    if (raws.length > MAX_STICKERS) errors.push(`Too many stickers on the page (max ${MAX_STICKERS}).`);
    const norm: NonNullable<Presentation['stickers']> = [];
    for (const s of raws) {
      if (s === null || typeof s !== 'object') { errors.push('Each sticker must be an object.'); continue; }
      const ss = s as Record<string, unknown>;
      const slot = String(ss.slot ?? '');
      if (!STICKER_SLOTS.includes(slot as never)) { errors.push(`Unknown sticker slot "${slot}".`); continue; }
      const id = String(ss.id ?? '');
      // id must be a house pack ref or an uploaded asset ref (never a raw URL/svg).
      if (!/^house:[a-z]+:\d+$/.test(id) && !/^asset:\d+$/.test(id)) { errors.push(`Unknown sticker "${id}".`); continue; }
      const scale = ss.scale != null ? Number(ss.scale) : 1;
      const rotate = ss.rotate != null ? Number(ss.rotate) : 0;
      if (scale < 0.5 || scale > 2) errors.push('Sticker scale must be between 0.5x and 2x.');
      if (rotate < -30 || rotate > 30) errors.push('Sticker rotation must be between -30 and 30 degrees.');
      const sticker: StickerPlacement = { id, slot: slot as StickerSlot, scale, rotate, flip: ss.flip === true };
      if (ss.anchorIndex != null) sticker.anchorIndex = Number(ss.anchorIndex);
      norm.push(sticker);
    }
    if (!errors.length) stickers = norm;
  }

  // frames
  let frames: Presentation['frames'] | undefined;
  if (c.frames != null && typeof c.frames === 'object') {
    const f = c.frames as Record<string, unknown>;
    const okDefault = f.default == null || FRAME_STYLES.includes(f.default as never);
    const okDivider = f.divider == null || ['none', 'line', 'dots', 'wave'].includes(String(f.divider));
    if (!okDefault) errors.push(`Unknown frame style "${String(f.default)}".`);
    if (!okDivider) errors.push(`Unknown divider style "${String(f.divider)}".`);
    if (okDefault && okDivider) {
      frames = {};
      if (f.default != null) frames.default = f.default as FrameStyle;
      if (f.divider != null) frames.divider = f.divider as 'none' | 'line' | 'dots' | 'wave';
    }
  }

  // liveNow (curator toggle): url must be https; expiresAt <= 12h out. The API sets
  // these; validation keeps a hand-edited config honest.
  let liveNow: Presentation['liveNow'] | undefined;
  if (c.liveNow != null && typeof c.liveNow === 'object') {
    const ln = c.liveNow as Record<string, unknown>;
    const url = String(ln.url ?? '');
    let okUrl = false;
    try { okUrl = new URL(url).protocol === 'https:'; } catch { okUrl = false; }
    const exp = Date.parse(String(ln.expiresAt ?? ''));
    if (!okUrl) errors.push('Live URL must be a valid https link.');
    else if (!Number.isFinite(exp)) errors.push('Live status is missing an expiry.');
    else if (exp - Date.now() > 12 * 3600_000 + 60_000) errors.push('Live status can last at most 12 hours.');
    else {
      liveNow = { url, expiresAt: new Date(exp).toISOString() };
      if (typeof ln.label === 'string' && ln.label.trim()) liveNow.label = ln.label.trim().slice(0, 80);
    }
  }

  // V-SPACE-FLOW: comeback mode - a curator-armed event window, max 45 days.
  let comebackMode: Presentation['comebackMode'] | undefined;
  if (c.comebackMode != null && typeof c.comebackMode === 'object') {
    const cm = c.comebackMode as Record<string, unknown>;
    const title = String(cm.title ?? '').trim();
    const start = Date.parse(String(cm.startsAt ?? ''));
    const end = Date.parse(String(cm.endsAt ?? ''));
    if (!title) errors.push('Comeback mode needs a title.');
    else if (title.length > 80) errors.push('Comeback title is too long (max 80 characters).');
    if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push('Comeback mode needs valid start and end times.');
    else if (end <= start) errors.push('The comeback release must be after the window start.');
    else if (end - start > 45 * 86400_000) errors.push('A comeback window can last at most 45 days.');
    else if (title && title.length <= 80) {
      comebackMode = { title, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
      const pk = String(cm.pinKind ?? '');
      if (pk === 'timeline' || pk === 'community') comebackMode.pinKind = pk;
    }
  }

  // celebrations toggle (anniversary auto-moments): boolean only.
  let celebrations: boolean | undefined;
  if (c.celebrations != null) {
    if (typeof c.celebrations !== 'boolean') errors.push('Celebrations must be on or off.');
    else celebrations = c.celebrations;
  }

  // V-TEXT: per-section fold preference. Keys are section keys, values a small
  // enum. The sub-page option is NOT accepted until V-PAGES ships it for real.
  let textFolds: Presentation['textFolds'] | undefined;
  if (c.textFolds != null && typeof c.textFolds === 'object' && !Array.isArray(c.textFolds)) {
    const tf = c.textFolds as Record<string, unknown>;
    const keys = Object.keys(tf);
    if (keys.length > 20) errors.push('Too many text fold preferences (max 20).');
    else {
      const norm: Record<string, 'inline' | 'folded'> = {};
      for (const k of keys) {
        const v = String(tf[k] ?? '');
        if (k.length === 0 || k.length > 40) { errors.push('Text fold section keys must be 1-40 characters.'); continue; }
        if (v !== 'inline' && v !== 'folded') { errors.push(`Unknown text fold mode "${v}" (inline or folded).`); continue; }
        norm[k] = v;
      }
      if (!errors.length) textFolds = norm;
    }
  }

  // V-PAGES: enabled kind ids. Shape-validated here (slug-like, deduped, capped);
  // resolved against the kind registry at READ (kindsForSpace ignores unknown
  // ids), keeping this validator decoupled from the kinds config.
  let enabledKinds: string[] | undefined;
  if (c.enabledKinds != null) {
    if (!Array.isArray(c.enabledKinds)) errors.push('enabledKinds must be a list of kind ids.');
    else if (c.enabledKinds.length > 30) errors.push('Too many enabled kinds (max 30).');
    else {
      const ids = [...new Set(c.enabledKinds.map((k) => String(k ?? '').trim()))].filter((k) => k.length > 0);
      const bad = ids.find((k) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k) || k.length > 40);
      if (bad !== undefined) errors.push(`Invalid kind id "${bad}".`);
      else enabledKinds = ids;
    }
  }

  // V-HARMONY-2A: per-door-type presentation, keyed by door id (the textFolds
  // pattern). Only the four formats + a capped heading override are accepted;
  // unknown door ids / formats are rejected so config can never invent a door.
  let doorways: Presentation['doorways'] | undefined;
  if (c.doorways != null && typeof c.doorways === 'object' && !Array.isArray(c.doorways)) {
    const raw = c.doorways as Record<string, unknown>;
    const norm: NonNullable<Presentation['doorways']> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!DOORWAY_IDS.includes(k as never)) { errors.push(`Unknown doorway "${k}".`); continue; }
      if (v == null || typeof v !== 'object') { errors.push(`Doorway "${k}" config must be an object.`); continue; }
      const vv = v as Record<string, unknown>;
      const id = k as (typeof DOORWAY_IDS)[number];
      const cfg: NonNullable<Presentation['doorways']>[typeof id] = { format: DOORWAY_DEFAULTS[id].format };
      if (vv.format != null) {
        if (!DOORWAY_FORMATS.includes(vv.format as never)) { errors.push(`Unknown doorway format "${String(vv.format)}" (link, button, card or feature).`); continue; }
        cfg.format = vv.format as (typeof DOORWAY_FORMATS)[number];
      }
      if (vv.label != null) {
        if (typeof vv.label !== 'string') { errors.push(`Doorway "${k}" label must be text.`); continue; }
        const label = vv.label.trim().slice(0, DOORWAY_MAX_LABEL);
        if (label) cfg.label = label;
      }
      // collapsed = a native <details> disclosure; the links stay in the HTML
      // (never a link-removing hide), so no SEO carve-out is needed.
      if (vv.collapsed === true) cfg.collapsed = true;
      else if (vv.collapsed != null && vv.collapsed !== false) { errors.push(`Doorway "${k}" collapsed must be true or false.`); continue; }
      norm[id] = cfg;
    }
    if (!errors.length && Object.keys(norm).length) doorways = norm;
  } else if (c.doorways != null) {
    errors.push('Doorways config must be an object keyed by door.');
  }

  if (errors.length) return { ok: false, errors };

  const value: Presentation = { version: PRESENTATION_VERSION };
  if (c.preset != null) value.preset = c.preset as PresetId;
  if (c.template != null) value.template = c.template as NonNullable<Presentation['template']>;
  if (accent) value.accent = accent;
  if (c.banner != null && typeof c.banner === 'object') value.banner = c.banner as BannerConfig;
  if (welcome) value.welcome = welcome;
  if (tabs) value.tabs = tabs;
  if (modules) value.modules = modules;
  if (stickers) value.stickers = stickers;
  if (frames) value.frames = frames;
  if (liveNow) value.liveNow = liveNow;
  if (comebackMode) value.comebackMode = comebackMode;
  if (celebrations !== undefined) value.celebrations = celebrations;
  if (textFolds) value.textFolds = textFolds;
  if (enabledKinds) value.enabledKinds = enabledKinds;
  if (doorways) value.doorways = doorways;
  return { ok: true, value, errors: [] };
}
