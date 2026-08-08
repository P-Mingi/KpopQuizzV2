// V-FOUNDATION F2 Phase 3 - the SAFE bridge between the contenteditable DOM and the run
// model (blocks.ts). htmlFromRuns builds the initial editable HTML from stored runs (text
// escaped, only our fixed tags); runsFromEl walks the edited DOM back into runs (tolerant of
// the tags the browser produces for bold/italic/underline/highlight/links). No raw HTML is
// ever trusted: storage is always runs, so the reader stays XSS-safe by construction.

import type { Run, Mark } from './blocks';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** runs -> editable HTML (for setting a contenteditable block's initial content). */
export function htmlFromRuns(runs: Run[] | undefined): string {
  if (!runs || runs.length === 0) return '';
  return runs.map((r) => {
    let h = esc(r.text) || '';
    const m = r.marks ?? [];
    if (m.includes('b')) h = `<strong>${h}</strong>`;
    if (m.includes('i')) h = `<em>${h}</em>`;
    if (m.includes('u')) h = `<u>${h}</u>`;
    if (m.includes('mark')) h = `<mark>${h}</mark>`;
    if (r.link?.toSlug) h = `<a data-slug="${esc(r.link.toSlug)}" class="ed-link">${h}</a>`;
    else if (r.link?.href) h = `<a href="${esc(r.link.href)}" class="ed-link">${h}</a>`;
    return h;
  }).join('');
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
