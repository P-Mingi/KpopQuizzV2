// Dry run of the quiz of the day rotation (Mission U, owner 2026-10-15). It replays the real
// rotateQotd (lib/ux-v1/p1/qotd-rotation.ts) on an in-memory store seeded with the open bank
// rows read from the database and the rows of the given lots, and prints the quiz of each day.
// Nothing is written anywhere.
//
//   npx tsx scripts/daily-bank/simulate.mts [--from 2026-10-16] [--days 110] [--null-far-future] <lot.json> [...]
//
// --null-far-future simulates the lot SQL's first statement: the leftover rows dated 2029 and
// later lose their date, so the rotation pulls them before the lot's dated rows. Kpop only: the
// open bank rows and the groups are kpopquiz.org's (src/lib/daily-bank/kpop-scope.ts), the
// rotation of kpopquiz.org's quiz of the day.

import { kpopGroups, kpopOpenBank } from '../../src/lib/daily-bank/kpop-scope';
import { rotateQotd } from '../../src/lib/ux-v1/p1/qotd-rotation';

import { loadLots, readClient } from './lib.mts';

import type { QotdStore } from '../../src/lib/ux-v1/p1/qotd-rotation';
import type { OpenBankEntry } from '../../src/lib/quiz-bank-scheduling';

interface Row extends OpenBankEntry { title: string; published: boolean; publishedOn?: string }

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

async function main(): Promise<void> {
  const from = arg('--from', new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const days = Number(arg('--days', '110'));
  const nullFar = process.argv.includes('--null-far-future');
  const files = process.argv.slice(2).filter((a, i, all) => a.endsWith('.json') && !['--from', '--days'].includes(all[i - 1] ?? ''));

  const db = readClient();
  const [open, groups] = await Promise.all([kpopOpenBank(db), kpopGroups(db)]);
  const idOf = new Map(groups.map((g) => [g.slug, g.id]));

  const rows: Row[] = open.map((r) => ({
    ...r,
    scheduled_date: nullFar && r.scheduled_date && r.scheduled_date >= '2029-01-01' ? null : r.scheduled_date,
    published: false,
  }));
  loadLots(files).forEach((q, i) => rows.push({
    id: `lot-${String(i).padStart(3, '0')}`, title: q.title, group_id: q.group_slug ? idOf.get(q.group_slug) ?? null : null,
    category: q.category, scheduled_date: q.scheduled_date, status: 'verified', published: false,
  }));

  const featured = new Map<string, Row | 'catalog'>();
  const store: QotdStore = {
    async qotdFor(date) { const f = featured.get(date); return f ? (f === 'catalog' ? 'catalog' : f.id) : null; },
    async ensureDailyQuiz(date) {
      const r = rows.find((x) => !x.published && x.scheduled_date === date && (x.status === 'verified' || x.status === 'scheduled'));
      if (!r) return null;
      r.published = true; r.publishedOn = date; featured.set(date, r);
      return r.id;
    },
    async openBankEntries() { return rows.filter((r) => !r.published); },
    async qotdNeighbour(date) {
      const f = featured.get(date);
      return f && f !== 'catalog' ? { group_id: f.group_id, category: f.category } : null;
    },
    async moveBankEntry(id, date) { const r = rows.find((x) => x.id === id && !x.published); if (!r) return false; r.scheduled_date = date; r.status = 'scheduled'; return true; },
    async catalogCandidates() { return [{ id: 'catalog', group_id: null, play_count: 1, like_count: 0, total_completions: 1, total_score_sum: 1, question_count: 1 }]; },
    async logSince() { return []; },
    async featureQuiz(_id, date) { featured.set(date, 'catalog'); },
  };

  let catalogDays = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const res = await rotateQotd(store, date);
    const f = featured.get(date);
    // In production an empty day gets a catalog quiz (pickCatalogQotd); the stub store has none to offer.
    const label = !f || f === 'catalog' ? 'CATALOG FALLBACK (bank empty)' : `${f.title} [${f.category}${f.group_id ? `, group ${f.group_id}` : ''}]`;
    if (f === 'catalog' || !f) catalogDays += 1;
    console.log(`${date}  ${res.method.padEnd(11)} ${label}`);
  }
  const left = rows.filter((r) => !r.published).length;
  console.log(`\n${days} days from ${from}: ${catalogDays} day(s) on the catalog fallback, ${left} bank row(s) left.`);
}

main().catch((e) => { console.error(e); process.exit(2); });
