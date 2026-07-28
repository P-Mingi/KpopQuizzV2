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
      return `<h${lvl}>${children(n)}</h${lvl}>`;
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

export function renderTipTapJSON(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  return renderNode(doc as Node);
}
