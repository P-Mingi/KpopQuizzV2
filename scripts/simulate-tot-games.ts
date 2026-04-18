import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const envContent = fs.readFileSync('apps/quiz/.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface TotItem {
  id: string;
  name: string;
}

const GAMES_PER_CATEGORY = 100;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Simulate one game: sequential elimination, random picks. Returns winner ID + bracket. */
function simulateGame(items: TotItem[], poolSize: number): { winnerId: string; bracket: Array<{ winner_id: string; loser_id: string; round: number }> } {
  const pool = shuffle(items).slice(0, Math.min(poolSize, items.length));
  if (pool.length < 2) return { winnerId: pool[0]!.id, bracket: [] };

  let champ = pool[0]!;
  const queue = pool.slice(1);
  const bracket: Array<{ winner_id: string; loser_id: string; round: number }> = [];
  let matchIndex = 0;

  for (const opponent of queue) {
    // Random pick: 50/50
    const winner = Math.random() < 0.5 ? champ : opponent;
    const loser = winner === champ ? opponent : champ;
    bracket.push({ winner_id: winner.id, loser_id: loser.id, round: matchIndex });
    champ = winner;
    matchIndex++;
  }

  return { winnerId: champ.id, bracket };
}

async function main() {
  console.log(`Simulating ${GAMES_PER_CATEGORY} games per category...\n`);

  // Get all categories
  const { data: categories, error: catErr } = await supabase
    .from('tot_categories')
    .select('id, slug, title, pool_size')
    .eq('is_published', true)
    .order('title');

  if (catErr || !categories) {
    console.error('Failed to fetch categories:', catErr);
    return;
  }

  let totalGames = 0;

  for (const cat of categories) {
    // Get items for this category
    const { data: items, error: itemErr } = await supabase
      .from('tot_items')
      .select('id, name')
      .eq('category_id', cat.id);

    if (itemErr || !items || items.length < 2) {
      console.log(`  Skipping "${cat.title}" (${items?.length ?? 0} items)`);
      continue;
    }

    // Track pick counts and appear counts
    const pickCounts: Record<string, number> = {};
    const appearCounts: Record<string, number> = {};
    const winnerCounts: Record<string, number> = {};

    for (const item of items) {
      pickCounts[item.id] = 0;
      appearCounts[item.id] = 0;
    }

    // Simulate games
    const plays: Array<{ category_id: string; user_id: null; winner_id: string; bracket: unknown }> = [];

    for (let g = 0; g < GAMES_PER_CATEGORY; g++) {
      const { winnerId, bracket } = simulateGame(items as TotItem[], cat.pool_size);

      // Count picks and appearances from bracket
      for (const matchup of bracket) {
        pickCounts[matchup.winner_id] = (pickCounts[matchup.winner_id] ?? 0) + 1;
        appearCounts[matchup.winner_id] = (appearCounts[matchup.winner_id] ?? 0) + 1;
        appearCounts[matchup.loser_id] = (appearCounts[matchup.loser_id] ?? 0) + 1;
      }

      winnerCounts[winnerId] = (winnerCounts[winnerId] ?? 0) + 1;

      plays.push({
        category_id: cat.id,
        user_id: null,
        winner_id: winnerId,
        bracket,
      });
    }

    // Batch insert plays (in chunks of 50)
    for (let i = 0; i < plays.length; i += 50) {
      const chunk = plays.slice(i, i + 50);
      const { error: insertErr } = await supabase
        .from('tot_plays')
        .insert(chunk);
      if (insertErr) {
        console.error(`  Error inserting plays for "${cat.title}":`, insertErr.message);
      }
    }

    // Update item pick_count and appear_count
    for (const item of items) {
      const picks = pickCounts[item.id] ?? 0;
      const appears = appearCounts[item.id] ?? 0;
      if (picks > 0 || appears > 0) {
        await supabase
          .from('tot_items')
          .update({
            pick_count: picks,
            appear_count: appears,
          })
          .eq('id', item.id);
      }
    }

    // Update category play_count
    await supabase
      .from('tot_categories')
      .update({ play_count: GAMES_PER_CATEGORY + (cat.pool_size || 0) })
      .eq('id', cat.id);

    // Find top winner
    const topWinner = Object.entries(winnerCounts)
      .sort(([, a], [, b]) => b - a)[0];
    const topItem = items.find((i) => i.id === topWinner?.[0]);

    console.log(`  [${cat.title}] ${GAMES_PER_CATEGORY} games simulated. Top winner: ${topItem?.name ?? '?'} (${topWinner?.[1] ?? 0} wins)`);
    totalGames += GAMES_PER_CATEGORY;
  }

  console.log(`\nDone! ${totalGames} total games simulated across ${categories.length} categories.`);
}

main().catch(console.error);
