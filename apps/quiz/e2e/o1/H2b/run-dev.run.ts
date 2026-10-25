// Run O1, lot H2b: runs every block of the home once against the database named by the environment (scripts/o1/env.sh dev) and prints
// COUNTS and flags only: no title, no handle, no URL, no key. next/cache is replaced by a pass-through (no Next server here).
import { describe, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));

import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getBlindtest } from '@/lib/site/hub/data/blindtest';
import { getCrossover } from '@/lib/site/hub/data/crossover';
import { getDailyQuizzes } from '@/lib/site/hub/data/daily';
import { getDebate } from '@/lib/site/hub/data/debate';
import { getDidYouKnow } from '@/lib/site/hub/data/did-you-know';
import { getDoors } from '@/lib/site/hub/data/doors';
import { getForYou } from '@/lib/site/hub/data/for-you';
import { firstAnimePlay, getHot } from '@/lib/site/hub/data/hot';

import { getRotation } from '@/lib/site/hub/data/rotation';
import { getSixtySeconds } from '@/lib/site/hub/data/sixty-seconds';
import { getStartEasy } from '@/lib/site/hub/data/start-easy';
import { getSurprise } from '@/lib/site/hub/data/surprise';
import { getTopFans } from '@/lib/site/hub/data/top-fans';

import type { HubHotCard } from '@/lib/site/hub/data/types';

const out: string[] = [];
const say = (block: string, ms: number, facts: Record<string, unknown>): void => {
  out.push(`${block.padEnd(14)} ${String(ms).padStart(6)} ms  ${JSON.stringify(facts)}`);
};
async function timed<T>(block: string, fn: () => Promise<T | null>, facts: (v: T) => Record<string, unknown>): Promise<T | null> {
  const t = Date.now();
  const v = await fn();
  say(block, Date.now() - t, v === null ? { result: 'null' } : facts(v));
  return v;
}
const perGroupMax = (cards: readonly HubHotCard[]): number => {
  const m = new Map<string, number>();
  for (const c of cards) m.set(`${c.site}:${c.groupSlug}`, (m.get(`${c.site}:${c.groupSlug}`) ?? 0) + 1);
  return Math.max(0, ...m.values());
};

describe('every block against the branch', () => {
  it('runs', async () => {
    await timed('rotation', () => getRotation(), (v) => ({ utc: v.utcTime, paris: v.parisTime, zone: v.parisZone, secondsLeft: v.secondsLeft }));
    const daily = await timed('daily', () => getDailyQuizzes(), (v) => ({ kpop: !!v.kpop, anime: !!v.anime, kpopQuestions: v.kpop?.questionCount, animeQuestions: v.anime?.questionCount }));
    await timed('blindtest', () => getBlindtest(), (v) => ({ songCount: v.songCount, clip: v.clipSeconds, preview: v.previewUrl.startsWith('https://'), keys: Object.keys(v).length }));
    await timed('debate', () => getDebate(), (v) => ({ votes: v.votes, date: v.date }));
    await timed('hot', () => getHot(), (v) => ({
      all: v.all.length, kpop: v.kpop.length, anime: v.anime.length, allSites: v.all.map((c) => c.site[0]).join(''), basis: v.basis,
      maxPerGroup: Math.max(perGroupMax(v.all), perGroupMax(v.kpop), perGroupMax(v.anime)),
      hasQotd: [...v.all, ...v.kpop, ...v.anime].some((c) => c.id === daily?.kpop?.id || c.id === daily?.anime?.id),
    }));
    const first = await firstAnimePlay(createPublicReadClient());
    out.push(`animeFirstPlay  ${first ? `${Math.floor((Date.now() - Date.parse(first)) / 86_400_000)} days ago` : 'none'}`);
    await timed('doors', () => getDoors(), (v) => ({ kpopQuizzes: v.kpop.quizCount, kpopTopics: v.kpop.topicCount, animeQuizzes: v.anime.quizCount, animeTopics: v.anime.topicCount, kpopLabel: v.kpop.featuredLabel, animeLabel: v.anime.featuredLabel, featured: [!!v.kpop.featured, !!v.anime.featured] }));
    await timed('sixty', () => getSixtySeconds(), (v) => ({ site: v.site, options: v.options.length, hasAnecdote: v.explanation !== null, awardsXp: v.awardsXp, linkOk: v.quizHref.includes('/q/') }));
    await timed('didyouknow', () => getDidYouKnow(), (v) => ({ kpop: !!v.kpop, anime: !!v.anime, pool: v.pool, noRepeatDaysKpop: Math.min(60, v.pool.kpop), noRepeatDaysAnime: Math.min(60, v.pool.anime) }));
    await timed('startEasy', () => getStartEasy(), (v) => ({ kpop: !!v.kpop, anime: !!v.anime }));
    await timed('crossover', () => getCrossover(), (v) => ({ quizzes: v.quizzes.length, sites: v.quizzes.map((q) => q.site[0]).join(''), fact: !!v.fact, week: v.week }));
    await timed('topFans', () => getTopFans(), (v) => ({ fans: v.fans.length, basis: v.basis, levels: v.fans.filter((f) => f.level !== null).length }));
    await timed('surprise', () => getSurprise(), (v) => ({ pool: v.pool.length, kpop: v.pool.filter((c) => c.site === 'kpop').length, anime: v.pool.filter((c) => c.site === 'anime').length, played: v.playedIds.length }));

    // A real player with the most plays, to run the two personal blocks (id never printed).
    const db = createServiceRoleClient();
    const { data } = await db.from('plays').select('player_id').not('player_id', 'is', null).limit(1000);
    const counts = new Map<string, number>();
    for (const r of (data ?? []) as Array<{ player_id: string }>) counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1);
    const player = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (player) {
      await timed('forYou', () => getForYou({ userId: player }), (v) => ({ cards: v.cards.length, kinds: v.cards.map((c) => c.kind).join(','), bridgeOtherSite: v.cards.filter((c) => c.kind === 'bridge').every((c) => c.card.site !== v.fandom.site), via: v.cards.map((c) => c.via ?? '-').join(',') }));
      await timed('surpriseUser', () => getSurprise({ userId: player }), (v) => ({ pool: v.pool.length, played: v.playedIds.length }));
    } else {
      out.push('forYou          no player with plays on this branch');
    }
    const none = await getForYou({ userId: null });
    out.push(`forYou(guest)  ${none === null ? 'null' : 'NOT NULL'}`);
    console.log(`\n${out.join('\n')}\n`);
  });
});
