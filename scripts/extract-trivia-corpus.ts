/**
 * J1a - Trivia fact corpus extraction.
 *
 * Pulls every published quiz's questions for every group, builds the deduped
 * fun_fact list per group using the SAME normalizeFactKey + categorizeFact the
 * app uses, and writes docs/trivia-corpus.json. This is the corpus J1b verifies
 * facts against before writing overrides.
 *
 * Run (from repo root or apps/quiz):
 *   npx tsx scripts/extract-trivia-corpus.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import { createClient } from '@supabase/supabase-js';

import { categorizeFact } from '../apps/quiz/src/lib/trivia/categorize';
import { normalizeFactKey } from '../apps/quiz/src/lib/trivia/fact-key';

// --- env (manual .env.local parse, matches the other repo scripts) -----------
const ENV_CANDIDATES = ['apps/quiz/.env.local', '.env.local', '../apps/quiz/.env.local'];
const envFile = ENV_CANDIDATES.find((p) => fs.existsSync(p));
if (!envFile) {
  console.error('Could not find apps/quiz/.env.local'); process.exit(1);
}
for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  const k = t.slice(0, i);
  const v = t.slice(i + 1);
  if (!process.env[k]) process.env[k] = v;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CorpusFact {
  factKey: string;
  fact: string;
  autoCategory: string;
  sourceQuizSlug: string;
  sourceQuizTitle: string;
}

async function main(): Promise<void> {
  const { data: groups, error: gErr } = await supabase.from('groups').select('id, slug, name');
  if (gErr || !groups) { console.error('groups query failed', gErr); process.exit(1); }

  const { data: quizzes, error: qErr } = await supabase
    .from('quizzes')
    .select('group_id, title, slug, questions')
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(5000);
  if (qErr || !quizzes) { console.error('quizzes query failed', qErr); process.exit(1); }

  const slugById = new Map<number, string>();
  for (const g of groups) slugById.set(g.id as number, g.slug as string);

  const corpus: Record<string, CorpusFact[]> = {};
  const seenByGroup: Record<string, Set<string>> = {};

  for (const quiz of quizzes) {
    const slug = slugById.get(quiz.group_id as number);
    if (!slug) continue;
    const questions = (quiz.questions ?? []) as Array<{ question?: string; fun_fact?: string }>;
    for (const q of questions) {
      if (!q.fun_fact || q.fun_fact.trim().length <= 20) continue;
      const fact = q.fun_fact.trim();
      const factKey = normalizeFactKey(fact);
      if (!corpus[slug]) { corpus[slug] = []; seenByGroup[slug] = new Set(); }
      if (seenByGroup[slug]!.has(factKey)) continue;
      seenByGroup[slug]!.add(factKey);
      corpus[slug]!.push({
        factKey,
        fact,
        autoCategory: categorizeFact(fact, q.question || ''),
        sourceQuizSlug: quiz.slug as string,
        sourceQuizTitle: quiz.title as string,
      });
    }
  }

  // Counts (sorted desc) + grand total.
  const counts: Record<string, number> = {};
  let total = 0;
  for (const slug of Object.keys(corpus)) { counts[slug] = corpus[slug]!.length; total += counts[slug]!; }
  const sortedSlugs = Object.keys(corpus).sort((a, b) => counts[b]! - counts[a]!);

  const sortedCorpus: Record<string, CorpusFact[]> = {};
  for (const slug of sortedSlugs) sortedCorpus[slug] = corpus[slug]!;

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      totalFacts: total,
      groupCount: sortedSlugs.length,
      counts: Object.fromEntries(sortedSlugs.map((s) => [s, counts[s]])),
    },
    ...sortedCorpus,
  };

  const outDir = ['docs', '../docs'].find((d) => fs.existsSync(d)) ?? 'docs';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'trivia-corpus.json');
  fs.writeFileSync(file, JSON.stringify(output, null, 2));

  console.log(`Wrote ${file}`);
  console.log(`Total facts: ${total} across ${sortedSlugs.length} groups\n`);
  const highlight = ['bts', 'blackpink', 'stray-kids', 'twice', 'aespa', 'seventeen', 'newjeans'];
  console.log('Highlight groups:');
  for (const s of highlight) console.log(`  ${s.padEnd(12)} ${counts[s] ?? 0}`);
  console.log('\nTop 15 groups by fact count:');
  for (const s of sortedSlugs.slice(0, 15)) console.log(`  ${s.padEnd(16)} ${counts[s]}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
