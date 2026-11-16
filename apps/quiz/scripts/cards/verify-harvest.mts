// Bunnyverse Cards lot 6 (the photo harvest): checks the photos the researchers proposed and writes
//   docs/design/cards/data/lot6/photos.json   verdicts and credits (lot 3's shape, no birth date): the input of gen-harvest-sql.mts
//   docs/design/cards/data/lot6/SUMMARY.md    counts only (for minors, only the number of locked pockets a group)
//   <notes>/locked.md                         PRIVATE: each locked pocket with its group, name and opening month
//
//   ../../node_modules/.bin/tsx scripts/cards/verify-harvest.mts --candidates <dir> --people <dir> [--groups <dir>] [--notes <dir>] [--subjects <file>] [--today YYYY-MM-DD]
//
// Reads docs/design/cards/data/lot6/subjects.json, <candidates>/<slug>.json (lot 3's CandidateFile), every <people>/*.json (private, birth
// dates: refused inside the repository, as verify-photos.mts does), every <groups>/*.json (private lineup records, default <notes>/groups: a
// group photo needs a complete one) and lot 3's photos.json (the photos already in the game). Asks the Commons
// public API about the candidates of the UNLOCKED subjects only (ten titles a request, one request a second). The rules live in
// src/lib/cards/harvest-checks.ts.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mergePeople, publicJson, runHarvest, titlesToAsk, type GroupLineup, type HarvestSubject, type Lot3Subject, type PrivatePerson } from '../../src/lib/cards/harvest-checks';
import type { CandidateFile, CommonsInfo } from '../../src/lib/cards/photo-checks';
import { REPO, arg, commonsInfo, fileOfPage, outsideRepo } from './commons-io.mts';

export const LOT6_DIR = path.join(REPO, 'docs/design/cards/data/lot6');
const LOT3_PHOTOS = path.join(REPO, 'docs/design/cards/data/photos.json');

const jsonFiles = (dir: string): string[] => readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f));

async function main(): Promise<void> {
  const cand = arg('--candidates');
  const peopleDir = arg('--people');
  if (!cand || !peopleDir) {
    console.error('usage: tsx scripts/cards/verify-harvest.mts --candidates <dir> --people <dir> [--notes <dir>] [--subjects <file>] [--today YYYY-MM-DD]');
    process.exit(2);
  }
  const notes = arg('--notes') ?? path.join(os.homedir(), 'kpq-o1/notes/cards-lot6');
  const subjectsFile = arg('--subjects') ?? path.join(LOT6_DIR, 'subjects.json');
  const today = arg('--today') ?? new Date().toISOString().slice(0, 10);
  const groupsDir = arg('--groups') ?? path.join(notes, 'groups');
  for (const f of [cand, peopleDir, notes, groupsDir]) {
    if (!outsideRepo(f)) throw new Error(`refused: ${f} is private research and must stay outside the repository`);
  }
  const subjects = JSON.parse(readFileSync(subjectsFile, 'utf8')) as HarvestSubject[];
  const people = mergePeople(jsonFiles(peopleDir).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as PrivatePerson[]));
  const candidates = new Map<string, CandidateFile>();
  for (const f of jsonFiles(cand)) {
    const c = JSON.parse(readFileSync(f, 'utf8')) as CandidateFile;
    candidates.set(c.slug, c);
  }
  const lot3 = (JSON.parse(readFileSync(LOT3_PHOTOS, 'utf8')) as { subjects: Lot3Subject[] }).subjects;
  const groups = new Map<string, GroupLineup>();
  if (existsSync(groupsDir)) for (const f of jsonFiles(groupsDir)) { const g = JSON.parse(readFileSync(f, 'utf8')) as GroupLineup; groups.set(g.slug, g); }

  // the groups public.groups has (read only by the integrator, 2026-11-16): a group outside the list has no row, its photos are out
  const dbFile = arg('--db-groups') ?? path.join(LOT6_DIR, 'db-groups.json');
  const dbGroups = existsSync(dbFile) ? new Set((JSON.parse(readFileSync(dbFile, 'utf8')) as { slugs: string[] }).slugs) : undefined;
  const run = { subjects, people, candidates, lot3, info: new Map<string, CommonsInfo>(), today, groups, dbGroups };
  const titles = titlesToAsk(run, fileOfPage);
  console.log(`asking Commons about ${titles.length} files`);
  run.info = await commonsInfo(titles);

  const out = runHarvest(run);
  mkdirSync(LOT6_DIR, { recursive: true });
  mkdirSync(notes, { recursive: true, mode: 0o700 });
  writeFileSync(path.join(LOT6_DIR, 'photos.json'), publicJson(out.file));
  writeFileSync(path.join(LOT6_DIR, 'SUMMARY.md'), out.summary);
  writeFileSync(path.join(notes, 'locked.md'), out.lockedMd, { mode: 0o600 });
  const c = out.counts;
  console.log(`${c.subjects} subjects (${c.locked} locked), photos: ${c.auto} auto, ${c.pending} to review, ${c.out} out; cards ${c.cardsBefore} -> ${c.cardsAfter}`);
  if (!existsSync(path.join(notes, 'locked.md'))) throw new Error('locked.md was not written');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
}
