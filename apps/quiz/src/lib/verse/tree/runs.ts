// V-FOUNDATION F2 Phase 3 - the SAFE bridge between the contenteditable DOM and the run
// model (blocks.ts). appendRuns builds a block's editable content from stored runs; runsFromEl walks
// the edited DOM back into runs (tolerant of the tags the browser produces for bold/italic/underline/
// highlight/links). No raw HTML is ever trusted: storage is always runs, so the reader stays XSS-safe.
//
// FLAW-2 (integrator fix, 2026-11-12): the editor builds NO HTML string any more. htmlFromRuns wrote
// `<a href="${esc(href)}">` into innerHTML with an escaper that left quotes alone, so a stored
// `https://x/"onmouseover="...` became an attribute; it is gone, and its escaper with it (nothing is
// left to escape). Every element is made with createElement, every attribute with setAttribute, every
// text as a text node: a stored value can never become an element, an attribute or a script. A link is
// rebuilt only from a slug (isSlug) or from an href safeHref accepts, the rules of the save.

import { isSlug, safeHref } from './blocks';
import type { Run, Mark, RunLink } from './blocks';

// innermost first, as before: <a><mark><u><em><strong>text</strong></em></u></mark></a>.
const MARK_TAGS: readonly [Mark, string][] = [['b', 'strong'], ['i', 'em'], ['u', 'u'], ['mark', 'mark']];

/** The editor's one link element (a stored run, the toolbar Link, the [[ page picker), built with
 * createElement + setAttribute. A page link carries its slug (data-slug), an external one only an href
 * safeHref accepts. null = no link (the text stays, unlinked). */
export function linkElement(doc: Document, link: RunLink | undefined): HTMLAnchorElement | null {
  if (!link || typeof link !== 'object') return null;
  const slug = link.toSlug ? (typeof link.toSlug === 'string' && isSlug(link.toSlug) ? link.toSlug : null) : undefined;
  const href = slug === undefined ? safeHref(link.href) : null;
  if (!slug && !href) return null;
  const a = doc.createElement('a');
  if (slug) a.setAttribute('data-slug', slug);
  else a.setAttribute('href', href!);
  a.setAttribute('class', 'ed-link');
  return a;
}

/** stored runs -> nodes appended to `parent` (a text block or a list row). The stored value is not
 * trusted: a run that is not an object is skipped, a text that is not a string is empty. */
export function appendRuns(parent: Element, runs: unknown): void {
  const doc = parent.ownerDocument;
  for (const raw of Array.isArray(runs) ? runs : []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Run;
    let node: Node = doc.createTextNode(typeof r.text === 'string' ? r.text : '');
    const marks: unknown[] = Array.isArray(r.marks) ? r.marks : [];
    for (const [mark, tag] of MARK_TAGS) {
      if (!marks.includes(mark)) continue;
      const el = doc.createElement(tag);
      el.appendChild(node);
      node = el;
    }
    const a = linkElement(doc, r.link);
    if (a) { a.appendChild(node); node = a; }
    parent.appendChild(node);
  }
}

/** stored list items -> <li> rows appended to `list` (an empty list keeps one empty row to type in). */
export function appendListItems(list: Element, items: unknown): void {
  const doc = list.ownerDocument;
  const rows = Array.isArray(items) && items.length ? items : [[]];
  for (const it of rows) {
    const li = doc.createElement('li');
    appendRuns(li, it);
    list.appendChild(li);
  }
}

/** stored table rows -> <tr> rows of editable cells appended to `body`; the first row is the header.
 * A cell is plain text (textContent), so `<`, `&` and quotes stay the characters they are. */
export function appendTableRows(body: Element, rows: unknown): void {
  const doc = body.ownerDocument;
  const list = Array.isArray(rows) && rows.length ? rows : [['', ''], ['', '']];
  list.forEach((row, ri) => {
    const tr = doc.createElement('tr');
    for (const c of Array.isArray(row) ? row : []) {
      const cell = doc.createElement(ri === 0 ? 'th' : 'td');
      cell.setAttribute('contenteditable', 'true');
      cell.textContent = typeof c === 'string' ? c : '';
      tr.appendChild(cell);
    }
    body.appendChild(tr);
  });
}

const TAG_MARK: Record<string, Mark> = { STRONG: 'b', B: 'b', EM: 'i', I: 'i', U: 'u', MARK: 'mark' };

/** the edited DOM of one block -> runs. Flattens nested marks; reads a link from an <a>. */
export function runsFromEl(el: HTMLElement | null): Run[] {
  const out: Run[] = [];
  if (!el) return out;
  const walk = (node: Node, marks: Set<Mark>, link: Run['link'] | undefined): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (text) out.push(mk(text, marks, link));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const e = child as HTMLElement;
        if (e.tagName === 'BR') { out.push(mk('\n', marks, link)); continue; }
        const nextMarks = new Set(marks);
        const m = TAG_MARK[e.tagName];
        if (m) nextMarks.add(m);
        let nextLink = link;
        if (e.tagName === 'A') {
          const slug = e.getAttribute('data-slug');
          const href = e.getAttribute('href');
          if (slug) nextLink = { toSlug: slug };
          else if (href) nextLink = { href };
        }
        // element carrying inline style bold/italic (browser fallback) -> treat as marks
        const st = e.getAttribute('style') ?? '';
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) nextMarks.add('b');
        if (/font-style:\s*italic/.test(st)) nextMarks.add('i');
        if (/underline/.test(st)) nextMarks.add('u');
        walk(e, nextMarks, nextLink);
      }
    }
  };
  walk(el, new Set(), undefined);
  return coalesce(out);
}

function mk(text: string, marks: Set<Mark>, link: Run['link'] | undefined): Run {
  const r: Run = { text };
  if (marks.size) r.marks = [...marks];
  if (link) r.link = link;
  return r;
}
// merge adjacent runs with identical marks + link (keeps the stored runs tidy).
function coalesce(runs: Run[]): Run[] {
  const out: Run[] = [];
  const key = (r: Run): string => `${(r.marks ?? []).slice().sort().join(',')}|${r.link?.toSlug ?? ''}|${r.link?.href ?? ''}`;
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && key(last) === key(r)) last.text += r.text;
    else out.push({ ...r });
  }
  return out.filter((r) => r.text.length > 0);
}

/** plain text of a block's runs (for the word count / substance / TOC). */
export function runsPlain(runs: Run[] | undefined): string {
  return (runs ?? []).map((r) => r.text).join('');
}
