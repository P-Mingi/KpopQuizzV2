// SEO Mission 2 part B point 8: writes the owner-run SQL that inserts a Team quiz as a DRAFT,
// and its rollback, from the versioned content file. Nothing here touches a database.
//
// Usage (from apps/quiz): node scripts/build-team-quiz-sql.mjs bts-army-level-test
// Reads  src/data/team-quizzes/<slug>.json
// Writes ../../docs/pending-migrations/seo-m2-<slug>.sql and seo-m2-<slug>-rollback.sql
// The unit test src/lib/quiz/team-quiz-content.test.ts checks the SQL is the output of this
// script for the current content file, so the two can never drift.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildTeamQuizSql } from './team-quiz-sql.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
  console.error('usage: node scripts/build-team-quiz-sql.mjs <slug>');
  process.exit(1);
}

const src = fileURLToPath(new URL(`../src/data/team-quizzes/${slug}.json`, import.meta.url));
const content = JSON.parse(await readFile(src, 'utf8'));
const { up, down } = buildTeamQuizSql(content);
const dir = new URL('../../../docs/pending-migrations/', import.meta.url);
await writeFile(new URL(`seo-m2-${slug}.sql`, dir), up);
await writeFile(new URL(`seo-m2-${slug}-rollback.sql`, dir), down);
console.log(`[team-quiz] wrote docs/pending-migrations/seo-m2-${slug}.sql and its rollback`);
