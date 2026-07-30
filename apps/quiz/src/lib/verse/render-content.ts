// Server-side renderer for the editor's constrained TipTap document JSON -> HTML.
// Written by hand (no extra dependency) so section content is crawlable SSR HTML.
// It is an ALLOWLIST: only the schema-constrained node/mark set renders; anything
// unknown is dropped. All text is HTML-escaped. Images render only from
// policy-approved hosts (strict-legal images rule).
import { isConfiguredImageHost } from '@/lib/image-hosts';

interface Mark { type: string; attrs?: Record<string, unknown> }
interface Node {
  type?: string;
  content?: Node[];
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Only same-origin or http(s) hrefs; no javascript: etc.
function safeHref(href: unknown): string | null {
  const s = String(href ?? '');
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return null;
}

function renderText(n: Node): string {
  let html = esc(n.text ?? '');
  for (const m of n.marks ?? []) {
    if (m.type === 'bold') html = `<strong>${html}</strong>`;
    else if (m.type === 'italic') html = `<em>${html}</em>`;
    else if (m.type === 'link') {
      const href = safeHref(m.attrs?.href);
      if (href) html = `<a href="${esc(href)}" class="verse-cite" rel="nofollow noopener" target="_blank">${html}</a>`;
    }
    // other marks are dropped by allowlist
  }
  return html;
}

function children(n: Node): string {
  return (n.content ?? []).map(renderNode).join('');
}

function renderNode(n: Node): string {
  switch (n.type) {
    case 'text': return renderText(n);
    case 'paragraph': return `<p>${children(n)}</p>`;
    case 'heading': {
      const lvl = Number(n.attrs?.level) === 3 ? 3 : 2; // h2/h3 only (page owns h1)
      const id = headingSlug(plainText(n));
      return `<h${lvl} id="${id}">${children(n)}</h${lvl}>`;
    }
    case 'bulletList': return `<ul>${children(n)}</ul>`;
    case 'orderedList': return `<ol>${children(n)}</ol>`;
    case 'listItem': return `<li>${children(n)}</li>`;
    case 'blockquote': return `<blockquote>${children(n)}</blockquote>`;
    case 'horizontalRule': return '<hr />';
    case 'hardBreak': return '<br />';
    case 'table': return `<div class="verse-table-wrap"><table>${children(n)}</table></div>`;
    case 'tableRow': return `<tr>${children(n)}</tr>`;
    case 'tableHeader': return `<th>${children(n)}</th>`;
    case 'tableCell': return `<td>${children(n)}</td>`;
    case 'image': {
      const src = String(n.attrs?.src ?? '');
      const alt = esc(String(n.attrs?.alt ?? ''));
      if (!src || !isConfiguredImageHost(src)) return ''; // strict-legal: only approved hosts
      return `<figure class="verse-figure"><img src="${esc(src)}" alt="${alt}" loading="lazy" /></figure>`;
    }
    case 'verseEmbed': {
      const kind = String(n.attrs?.kind ?? '');
      const group = String(n.attrs?.group ?? '').replace(/[^a-z0-9-]/g, '');
      if (!group) return '';
      const map: Record<string, { href: string; title: string; sub: string }> = {
        discography: { href: `/verse/${group}/discography`, title: 'Discography', sub: 'Albums, EPs and singles' },
        quiz: { href: `/${group}-quiz`, title: 'Play the quiz', sub: 'Test your knowledge' },
        stats: { href: `/verse/${group}`, title: 'Space stats', sub: 'Members, releases and fan activity' },
      };
      const w = map[kind]; if (!w) return '';
      return `<a href="${esc(w.href)}" class="verse-embed-card"><span class="verse-embed-title">${esc(w.title)}</span><span class="verse-embed-sub">${esc(w.sub)}</span></a>`;
    }
    case 'mention': {
      const label = esc(String(n.attrs?.label ?? n.attrs?.id ?? ''));
      const href = safeHref(n.attrs?.id); // the picker stores the Verse URL in id
      if (!label) return '';
      return href ? `<a href="${esc(href)}" class="verse-mention">@${label}</a>` : `<span class="verse-mention">@${label}</span>`;
    }
    case 'doc': return children(n);
    default: return n.content ? children(n) : '';
  }
}

/** True when the document has any real content (so the reader can min-gate). */
export function contentIsEmpty(doc: unknown): boolean {
  const html = renderTipTapJSON(doc);
  return html.replace(/<[^>]*>/g, '').trim().length === 0;
}

function plainText(n: Node): string {
  if (n.type === 'text') return n.text ?? '';
  return (n.content ?? []).map(plainText).join('');
}

/** First ~`max` chars of a document's visible text, for a story teaser/excerpt. */
export function plainTextExcerpt(doc: unknown, max = 160): string {
  if (!doc || typeof doc !== 'object') return '';
  const text = plainText(doc as Node).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
const headingSlug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';

export interface TocHeading { level: 2 | 3; text: string; id: string; }

/** Extract h2/h3 headings (with anchor ids) for the auto-TOC. */
export function extractHeadings(doc: unknown): TocHeading[] {
  const out: TocHeading[] = [];
  const walk = (n: Node): void => {
    if (n.type === 'heading') {
      const text = plainText(n).trim();
      if (text) out.push({ level: Number(n.attrs?.level) === 3 ? 3 : 2, text, id: headingSlug(text) });
    }
    (n.content ?? []).forEach(walk);
  };
  if (doc && typeof doc === 'object') walk(doc as Node);
  return out;
}

export function renderTipTapJSON(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  return renderNode(doc as Node);
}

export interface FoldSplit { previewHtml: string; restHtml: string; totalWords: number }

/** V-TEXT - split a doc into a preview (first `previewBlocks` top-level blocks)
 * and the rest, both crawlable HTML. THE FOLD LAW: callers must keep restHtml in
 * the served HTML (a native <details>), never fetch-on-expand, so the fold is
 * presentation only and SEO + JS-off readers are unharmed. */
export function splitTipTapForFold(doc: unknown, previewBlocks = 2): FoldSplit {
  if (!doc || typeof doc !== 'object') return { previewHtml: '', restHtml: '', totalWords: 0 };
  const d = doc as Node;
  const blocks = d.content ?? [];
  const totalWords = plainText(d).split(/\s+/).filter(Boolean).length;
  if (blocks.length <= previewBlocks) return { previewHtml: renderNode(d), restHtml: '', totalWords };
  return {
    previewHtml: renderNode({ ...d, content: blocks.slice(0, previewBlocks) }),
    restHtml: renderNode({ ...d, content: blocks.slice(previewBlocks) }),
    totalWords,
  };
}
