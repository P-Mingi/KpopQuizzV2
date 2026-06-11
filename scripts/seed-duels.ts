/**
 * C2 - Seed duel questions + starting Elo from the existing This-or-That data.
 * Source: kpopquiz_pipeline1_duel_ranking_spec.md, Section 6 (seeding).
 *
 * For every PUBLISHED tot_category it upserts one duel_questions row, then seeds
 * one duel_ratings row per tot_item with an Elo derived from real play signal
 * (pick_count / appear_count). Writes go through the SERVICE-ROLE client, which
 * bypasses RLS. Idempotent: re-running upserts the same rows, never duplicates.
 *
 * Run (from repo root or apps/quiz):
 *   npx tsx scripts/seed-duels.ts
 */
import * as fs from 'fs';

import { createClient } from '@supabase/supabase-js';

// --- env (manual .env.local parse, matches extract-trivia-corpus.ts) ---------
const ENV_CANDIDATES = ['apps/quiz/.env.local', '.env.local', '../apps/quiz/.env.local'];
const envFile = ENV_CANDIDATES.find((p) => fs.existsSync(p));
if (!envFile) {
  console.error('Could not find apps/quiz/.env.local');
  process.exit(1);
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

interface TotCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: 'idol' | 'group' | 'song';
}

interface TotItem {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  pick_count: number | null;
  appear_count: number | null;
}

/** Elo seeded from real win rate, centered at 1500, clamped to [1300, 1700]. */
function seedElo(pick: number, appear: number): number {
  if (!appear || appear <= 0) return 1500;
  const raw = 1500 + Math.round((pick / appear - 0.5) * 400);
  return Math.max(1300, Math.min(1700, raw));
}

/**
 * Split a category slug into (group_slug, question_type). If the slug is
 * prefixed by a real group slug (e.g. "bts-members"), the question belongs to
 * that group and the remainder is the type ("members"). Otherwise it is a
 * cross-group question under "general" keyed by the full slug. Longest group
 * slug wins so "stray-kids-members" beats a hypothetical "stray".
 */
function deriveQuestion(
  slug: string,
  groupSlugs: string[],
): { groupSlug: string; questionType: string } {
  for (const g of groupSlugs) {
    if (slug.startsWith(`${g}-`)) {
      return { groupSlug: g, questionType: slug.slice(g.length + 1) };
    }
  }
  return { groupSlug: 'general', questionType: slug };
}

async function main(): Promise<void> {
  // Published categories = our launch set.
  const { data: categories, error: cErr } = await supabase
    .from('tot_categories')
    .select('id, slug, title, subtitle, type')
    .eq('is_published', true)
    .order('slug');
  if (cErr || !categories) {
    console.error('tot_categories query failed', cErr);
    process.exit(1);
  }

  // Real group slugs, longest first, for group-specific detection.
  const { data: groups, error: gErr } = await supabase.from('groups').select('slug');
  if (gErr || !groups) {
    console.error('groups query failed', gErr);
    process.exit(1);
  }
  const groupSlugs = (groups as { slug: string }[])
    .map((g) => g.slug)
    .sort((a, b) => b.length - a.length);

  let questionCount = 0;
  let ratingCount = 0;

  for (const cat of categories as TotCategory[]) {
    const { groupSlug, questionType } = deriveQuestion(cat.slug, groupSlugs);
    const prompt = (cat.subtitle && cat.subtitle.trim()) || cat.title;

    // 1. Upsert the question (unique on group_slug, question_type) and get its id.
    const { data: q, error: qErr } = await supabase
      .from('duel_questions')
      .upsert(
        {
          group_slug: groupSlug,
          question_type: questionType,
          prompt,
          entity_kind: cat.type,
          min_votes: 500,
        },
        { onConflict: 'group_slug,question_type' },
      )
      .select('id')
      .single();
    if (qErr || !q) {
      console.error(`upsert duel_questions failed for ${cat.slug}`, qErr);
      process.exit(1);
    }
    questionCount += 1;

    // 2. Seed ratings from this category's items.
    const { data: items, error: iErr } = await supabase
      .from('tot_items')
      .select('id, category_id, name, image_url, pick_count, appear_count')
      .eq('category_id', cat.id);
    if (iErr || !items) {
      console.error(`tot_items query failed for ${cat.slug}`, iErr);
      process.exit(1);
    }

    const ratings = (items as TotItem[]).map((it) => {
      const pick = it.pick_count ?? 0;
      const appear = it.appear_count ?? 0;
      return {
        question_id: q.id as string,
        entity_id: it.id,
        entity_name: it.name,
        entity_image: it.image_url ?? null,
        elo: seedElo(pick, appear),
        wins: pick,
        losses: Math.max(0, appear - pick),
        last_delta: 0,
      };
    });

    if (ratings.length > 0) {
      const { error: rErr } = await supabase
        .from('duel_ratings')
        .upsert(ratings, { onConflict: 'question_id,entity_id' });
      if (rErr) {
        console.error(`upsert duel_ratings failed for ${cat.slug}`, rErr);
        process.exit(1);
      }
      ratingCount += ratings.length;
    }

    console.log(
      `  ${groupSlug.padEnd(12)} ${questionType.padEnd(20)} (${cat.type}) -> ${ratings.length} entities`,
    );
  }

  console.log(`\nSeeded ${questionCount} duel_questions, ${ratingCount} duel_ratings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
