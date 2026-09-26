// P3 "Questions fans ask" (prototype #hb-faq, DESIGN-SPEC 16.7: questions in
// <details>, answers in the HTML, the first one open). The hub already carries
// two sets of real-fact questions: the fact-gated FAQ (buildGroupFaqs, also the
// FAQPage JSON-LD) and the W8 answer-first questions (buildAnswerChunks). v11
// shows them as ONE list, word for word: the FAQ version wins when both ask the
// same question (so the FAQPage JSON-LD keeps matching the visible text), and the
// list follows the prototype's order (members, debut, fandom, generation, ...).
// Pure: no I/O, no text is written here.

import type { ReactNode } from 'react';

export interface FaqSource { q: string; text: string; a: ReactNode }
export interface ChunkSource { question: string; answer: string }
export interface HubFaqItem { q: string; a: ReactNode; /** true when the item is in the FAQPage JSON-LD */ inJsonLd: boolean }

const ORDER: Array<[string, RegExp]> = [
  ['members', /^How many members does .+ have\?$/],
  ['debut', /^When did .+ debut\?$/],
  ['fandom', /fandom called\?$/],
  ['generation', /^What generation is .+\?$/],
  ['origin', /^Where is .+ from\?$/],
  ['label', /^What label is .+ on\?$/],
  ['quizzes', /^How many .+ quizzes are there\?$/],
  ['songs', /songs can I play in the blind test\?$/],
  ['blindtest', /^Is there a .+ blind test\?$/],
  ['free', /quizzes free\?$/],
];

function rank(q: string): number {
  const i = ORDER.findIndex(([, re]) => re.test(q));
  return i < 0 ? ORDER.length : i;
}

/** One ordered, de-duplicated list of today's hub questions. `faqs` must already
 *  be gated the way today's page gates them (shown when there are 2 or more). */
export function mergeHubFaqs(faqs: readonly FaqSource[], chunks: readonly ChunkSource[]): HubFaqItem[] {
  const seen = new Set<string>();
  const items: Array<HubFaqItem & { order: number; n: number }> = [];
  let n = 0;
  for (const f of faqs) {
    if (seen.has(f.q)) continue;
    seen.add(f.q);
    items.push({ q: f.q, a: f.a, inJsonLd: true, order: rank(f.q), n: n++ });
  }
  for (const c of chunks) {
    if (seen.has(c.question)) continue;
    seen.add(c.question);
    items.push({ q: c.question, a: c.answer, inJsonLd: false, order: rank(c.question), n: n++ });
  }
  return items
    .sort((a, b) => a.order - b.order || a.n - b.n)
    .map(({ q, a, inJsonLd }) => ({ q, a, inJsonLd }));
}
