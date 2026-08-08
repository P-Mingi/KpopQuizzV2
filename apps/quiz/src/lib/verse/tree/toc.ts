// V-FOUNDATION F1 Phase C - the reading rail. The TOC is auto-generated from the body's
// H2/H3 heading blocks (the prototype screen 01 "sommaire"), never hand-authored, so it
// can never drift from the prose. Anchors are slugified heading text, deduped.

import { pageSlug } from './slug';
import type { PageBody, PageBlock } from './types';

export interface TocItem { id: string; text: string; level: 2 | 3 }

function headingText(b: PageBlock): string {
  return typeof b.text === 'string' ? b.text : '';
}

/** H2/H3 blocks -> a TOC with stable, unique anchor ids (the same ids the body renders). */
export function extractToc(body: PageBody | null | undefined): TocItem[] {
  const out: TocItem[] = [];
  const seen = new Map<string, number>();
  for (const b of body?.blocks ?? []) {
    if (b.type !== 'heading') continue;
    const level = b.level === 3 ? 3 : 2;   // only H2/H3 in the rail
    const text = headingText(b).trim();
    if (!text) continue;
    let id = pageSlug(text);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    out.push({ id, text, level: level as 2 | 3 });
  }
  return out;
}

/** The stable anchor id for a heading block at render time (must match extractToc). */
export function headingAnchors(body: PageBody | null | undefined): Map<PageBlock, string> {
  const map = new Map<PageBlock, string>();
  const seen = new Map<string, number>();
  for (const b of body?.blocks ?? []) {
    if (b.type !== 'heading') continue;
    const text = headingText(b).trim();
    if (!text) continue;
    let id = pageSlug(text);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    map.set(b, id);
  }
  return map;
}
