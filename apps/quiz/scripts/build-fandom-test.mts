/**
 * Audit 04 P2-2: build the draft of a fandom level test ("STAY level test: are you a real STAY?") from a file of verified facts.
 *
 *   tsx scripts/build-fandom-test.mts input.json [--sourced src/lib/trivia/sourced/stray-kids.json] [--out draft.json]
 *
 * input.json is { group_slug, group_name, fandom, account, minors, sources: [{ id, title, url }], facts: [{ slot, question, answer,
 * distractors: [3], source_url, fun_fact?, factId? }] } (see src/lib/editorial/quiz/fandom-test.ts for the slots: 3 roster, fandom name
 * or debut song, 4 titles, albums or years, 2 charts or awards, 1 latest release). With --sourced, a fact that names a factId must be
 * verified there with the same answer. The output is the array the Team quiz import reads (one draft, with its result_levels).
 * It refuses a draft with an age, birth order, height or private life question, with a per-member question when a member is under 18,
 * with a placeholder fandom name, or with fewer than 10 facts. It reads files and writes the --out file, nothing else.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildFandomTest } from '../src/lib/editorial/quiz/fandom-test.ts';

import type { FandomInput, SourcedItem } from '../src/lib/editorial/quiz/fandom-test.ts';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
if (!file) { console.error('usage: tsx scripts/build-fandom-test.mts input.json [--sourced file.json] [--out draft.json]'); process.exit(1); }

const input = JSON.parse(readFileSync(resolve(file), 'utf8')) as FandomInput;
const sourced = new Map<string, SourcedItem>();
if (opt('sourced')) {
  const s = JSON.parse(readFileSync(resolve(opt('sourced')!), 'utf8')) as { facts: SourcedItem[] };
  for (const f of s.facts) sourced.set(f.id, f);
}
const r = buildFandomTest(input, sourced);
if (!r.ok) { console.error(r.errors.map((e) => `- ${e}`).join('\n')); process.exit(1); }
const out = JSON.stringify([r.payload], null, 2);
if (opt('out')) { writeFileSync(resolve(opt('out')!), `${out}\n`); console.log(`wrote ${opt('out')}: ${r.payload.questions.length} questions, ${r.levels.length} levels.`); } else console.log(out);
console.error(r.review.map((l) => `review: ${l}`).join('\n'));
