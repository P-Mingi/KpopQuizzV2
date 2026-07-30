// W-CUSTOM - server-side config validation (Zod-style, hand-rolled: NO new deps).
// Runs on every save AND publish. Enforces the two laws: the SEO INVARIANT
// (seoCritical blocks cannot be removed or hidden) and the READABILITY GUARDRAIL
// (text/background must pass WCAG AA). Unknown block types are rejected. Every
// failure is a plain human sentence a curator can act on.

import { BLOCK_REGISTRY, isKnownBlock, blockDef, defaultSeoCriticalTypes, FRAME_STYLES } from './registry';
import { PRESETS, ALLOWED_TABS, STICKER_SLOTS, PRESENTATION_VERSION } from './types';
import { isHex, accentReadableOn } from './contrast';

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
    const t = asArray(c.tabs).map(String);
    const bad = t.filter((x) => !ALLOWED_TABS.includes(x as never));
    if (bad.length) errors.push(`Unknown tab(s): ${bad.join(', ')}.`);
    if (new Set(t).size !== t.length) errors.push('Duplicate tabs are not allowed.');
    if (t.length < MIN_TABS || t.length > MAX_TABS) errors.push(`Pick between ${MIN_TABS} and ${MAX_TABS} tabs.`);
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
    for (const m of rawMods) {
      if (m === null || typeof m !== 'object') { errors.push('Each module must be an object.'); continue; }
      const mm = m as Record<string, unknown>;
      const type = String(mm.type ?? '');
      if (!isKnownBlock(type)) { errors.push(`Unknown block type "${type}".`); continue; }
      const def = blockDef(type)!;
      const zone = String(mm.zone ?? def.defaultZone ?? 'main') as ModulePlacement['zone'];
      if (!def.zones.includes(zone)) { errors.push(`"${def.label}" cannot go in the ${zone} zone.`); continue; }
      if (mm.frame != null && !FRAME_STYLES.includes(mm.frame as never)) { errors.push(`Unknown frame style "${String(mm.frame)}".`); continue; }
      // THE LAW: seoCritical blocks may not be hidden.
      const hidden = def.seoCritical ? false : mm.hidden === true;
      if (def.seoCritical && mm.hidden === true) errors.push(`"${def.label}" is core content and cannot be hidden.`);
      seen.add(type);
      const placement: ModulePlacement = { type, zone, hidden, order: Number(mm.order ?? norm.length) };
      if (mm.frame != null) placement.frame = mm.frame as FrameStyle;
      if (mm.mode != null) placement.mode = String(mm.mode);
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

  if (errors.length) return { ok: false, errors };

  const value: Presentation = { version: PRESENTATION_VERSION };
  if (c.preset != null) value.preset = c.preset as PresetId;
  if (accent) value.accent = accent;
  if (c.banner != null && typeof c.banner === 'object') value.banner = c.banner as BannerConfig;
  if (welcome) value.welcome = welcome;
  if (tabs) value.tabs = tabs;
  if (modules) value.modules = modules;
  if (stickers) value.stickers = stickers;
  if (frames) value.frames = frames;
  if (liveNow) value.liveNow = liveNow;
  return { ok: true, value, errors: [] };
}
