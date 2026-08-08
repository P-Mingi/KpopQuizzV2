// V-FOUNDATION F2 Phase 2 - the DOCUMENT BLOCK ENGINE. The page body is a V-BUILDER-1
// composition of blocks with STABLE ids (never the index; reorder keeps ids). Inline text
// is stored as structured RUNS (text + a fixed mark set), NOT raw HTML - so it is
// XSS-safe by construction (the renderer always escapes the text and only ever emits a
// fixed set of tags; there is no HTML string to sanitize). The clamp is FAIL-CLOSED:
// unknown block kinds and unknown marks are dropped, not stored.

export type Mark = 'b' | 'i' | 'u' | 'mark';
const MARKS: readonly Mark[] = ['b', 'i', 'u', 'mark'];

export interface RunLink { toSlug?: string; href?: string }   // an internal page link OR a safe external href
export interface Run { text: string; marks?: Mark[]; link?: RunLink }

// v1 SKELETON block kinds (the locked palette). Widgets (timeline/atlas/stickers/data) are
// intentionally NOT here - they are locked "bientot" and a stored one is dropped fail-closed.
export const BLOCK_KINDS = ['heading', 'paragraph', 'list', 'quote', 'callout', 'divider', 'image', 'table', 'link'] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export function isBlockKind(t: string): t is BlockKind { return (BLOCK_KINDS as readonly string[]).includes(t); }

export interface DocBlock {
  id: string;
  type: BlockKind;
  level?: 2 | 3;              // heading
  content?: Run[];           // heading/paragraph/quote/callout inline runs
  items?: Run[][];           // list rows
  cite?: string;             // quote attribution
  icon?: string;             // callout leading glyph
  path?: string;             // image storage path (ingest-copied, never an external URL)
  alt?: string; caption?: string;
  rows?: string[][];         // table cells (plain text v1)
  to_slug?: string; label?: string;  // block-level page link
}
export interface DocBody { version: 1; blocks: DocBlock[] }

const cap = (s: unknown, n: number): string => (typeof s === 'string' ? s : '').slice(0, n);
const isSlug = (s: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
const safeHref = (s: string): string | null => {
  const v = s.trim();
  if (v.startsWith('/') && !v.startsWith('//')) return v.slice(0, 300);        // site-relative
  try { return new URL(v).protocol === 'https:' ? v.slice(0, 300) : null; } catch { return null; }
};

function clampRun(raw: unknown): Run | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = cap(r.text, 4000);
  const out: Run = { text };
  const marks = Array.isArray(r.marks) ? r.marks.filter((m): m is Mark => MARKS.includes(m as Mark)) : [];
  if (marks.length) out.marks = [...new Set(marks)];
  if (r.link && typeof r.link === 'object') {
    const l = r.link as Record<string, unknown>;
    if (typeof l.toSlug === 'string' && isSlug(l.toSlug)) out.link = { toSlug: l.toSlug };
    else if (typeof l.href === 'string') { const h = safeHref(l.href); if (h) out.link = { href: h }; }
  }
  return text || out.link ? out : null;   // an empty run with no link is dropped
}
function clampRuns(raw: unknown): Run[] {
  return Array.isArray(raw) ? raw.map(clampRun).filter((r): r is Run => !!r) : [];
}
// legacy F1 blocks stored `text: string` (seed templates) - accept it as a single run.
function runsFrom(b: Record<string, unknown>): Run[] {
  if (Array.isArray(b.content)) return clampRuns(b.content);
  if (typeof b.text === 'string' && b.text.trim()) return [{ text: cap(b.text, 4000) }];
  if (typeof b.html === 'string' && b.html.trim()) return [{ text: cap(b.html.replace(/<[^>]*>/g, ''), 4000) }]; // strip any legacy html to plain
  return [];
}

let CID = 0;
const mintId = (): string => `b${Date.now().toString(36)}${(CID += 1)}`;

function clampBlock(raw: unknown): DocBlock | null {
  if (raw == null || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const type = String(b.type ?? '');
  if (!isBlockKind(type)) return null;                     // FAIL-CLOSED: unknown / locked-widget kinds dropped
  const id = typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(b.id) ? b.id : mintId();  // STABLE id preserved
  switch (type) {
    case 'heading': {
      const content = runsFrom(b);
      if (!content.length) return null;
      return { id, type, level: b.level === 3 ? 3 : 2, content };
    }
    case 'paragraph': { const content = runsFrom(b); return content.length ? { id, type, content } : null; }
    case 'quote': { const content = runsFrom(b); return content.length ? { id, type, content, ...(typeof b.cite === 'string' && b.cite.trim() ? { cite: cap(b.cite, 160) } : {}) } : null; }
    case 'callout': { const content = runsFrom(b); return content.length ? { id, type, content, icon: cap(b.icon, 8) || '\u{1F4A1}' } : null; }
    case 'list': {
      const items = Array.isArray(b.items) ? b.items.map(clampRuns).filter((r) => r.length) : [];
      return items.length ? { id, type, items } : null;
    }
    case 'divider': return { id, type };
    case 'image': {
      const path = typeof b.path === 'string' && !/^https?:\/\//i.test(b.path) ? cap(b.path, 400) : '';  // ingest-copied only
      return { id, type, ...(path ? { path } : {}), alt: cap(b.alt, 200), ...(typeof b.caption === 'string' ? { caption: cap(b.caption, 300) } : {}) };
    }
    case 'table': {
      const rows = Array.isArray(b.rows) ? b.rows.slice(0, 60).map((r) => Array.isArray(r) ? r.slice(0, 12).map((c) => cap(c, 300)) : []).filter((r) => r.length) : [];
      return rows.length ? { id, type, rows } : null;
    }
    case 'link': {
      const to = cap(b.to_slug, 80);
      return to ? { id, type, to_slug: to, label: cap(b.label, 200) || to } : null;
    }
    default: return null;
  }
}

/** Clamp a raw page body to the v1 block model. Fail-closed: unknown kinds are DROPPED. */
export function clampBlocks(raw: unknown): { body: DocBody; dropped: number } {
  const arr = raw && typeof raw === 'object' && Array.isArray((raw as { blocks?: unknown }).blocks)
    ? (raw as { blocks: unknown[] }).blocks : Array.isArray(raw) ? raw : [];
  let dropped = 0;
  const blocks = arr.map((b) => { const c = clampBlock(b); if (!c) dropped += 1; return c; }).filter((b): b is DocBlock => !!b);
  return { body: { version: 1, blocks }, dropped };
}

// ------------------------------------------------------------------ substance (C5)
const runText = (runs: Run[] | undefined): string => (runs ?? []).map((r) => r.text).join('');
const wordCount = (s: string): number => (s.trim().match(/\S+/g) ?? []).length;

export interface Substance { introWords: number; total: number; intro: boolean; section: boolean; enough: boolean; met: boolean; score: number }

/** The REAL C5 substance rule - the ONE computation shared by the server (is_stub) and the
 * client meter: a real intro (first paragraph >= 15 words) + at least one H2 + >= 60 words. */
export function substanceOf(body: DocBody | null | undefined): Substance {
  const blocks = body?.blocks ?? [];
  const firstPara = blocks.find((b) => b.type === 'paragraph');
  const introWords = wordCount(runText(firstPara?.content));
  let total = 0;
  for (const b of blocks) {
    if (b.content) total += wordCount(runText(b.content));
    if (b.items) for (const it of b.items) total += wordCount(runText(it));
    if (b.rows) for (const r of b.rows) total += wordCount(r.join(' '));
  }
  const intro = introWords >= 15;
  const section = blocks.some((b) => b.type === 'heading' && (b.level ?? 2) === 2);
  const enough = total >= 60;
  const score = Math.round(
    (intro ? 34 : Math.min(34, (introWords / 15) * 34)) + (section ? 33 : 0) + (enough ? 33 : Math.min(33, (total / 60) * 33)),
  );
  return { introWords, total, intro, section, enough, met: intro && section && enough, score };
}

/** Does the body meet the C5 substance bar (indexable)? A page also indexes when it carries
 * a fact rail (entity-bound with a builder) - that exemption stays in computeIsStub. */
export function bodyIsSubstantial(body: DocBody | null | undefined): boolean {
  return substanceOf(body).met;
}
