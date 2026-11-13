// Bunnyverse Cards lot 2: the age rule of the integrator (2026-11-12) over the 59 subjects. Reads the LOCAL research file (members, their
// dates and birth dates from Wikidata checked against English Wikipedia; it holds birth dates of minors, so it never enters the repository:
// the path is an argument, there is no default inside the repository) and writes docs/design/cards/data/age-check.json with the verdicts
// only: slug, in or out, the reason. No name, no date of birth, no other personal data goes to the repository.
//   tsx scripts/cards/age-check.mts <path to lineups.json> [--today YYYY-MM-DD]
// Exit code 1 when the research file does not cover the 59 subjects of subjects.json exactly.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ageVerdict, type AgeInput, type AgeReason } from '../../src/lib/cards/age-rule';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const AGE_JSON = path.join(REPO, 'docs/design/cards/data/age-check.json');
const SUBJECTS_JSON = path.join(REPO, 'docs/design/cards/data/subjects.json');

export interface AgeCheckRow {
  slug: string;
  ok: boolean;
  reason: AgeReason | null;
}
export interface AgeCheckFile {
  /** The day the rule was applied (today in the rule). */
  checked_on: string;
  /** Where the people and dates come from. */
  sources: string;
  subjects: AgeCheckRow[];
}

interface ResearchRow extends Omit<AgeInput, 'photo_date'> { slug: string; photo_date: string | null }

export function check(research: ResearchRow[], subjects: Array<{ slug: string; kind: 'idol' | 'group'; photo: { date: string } }>, today: string): { file: AgeCheckFile; problems: string[] } {
  const problems: string[] = [];
  const bySlug = new Map(research.map((r) => [r.slug, r]));
  if (bySlug.size !== research.length) problems.push('the research file has a slug twice');
  for (const r of research) if (!subjects.some((s) => s.slug === r.slug)) problems.push(`${r.slug}: in the research file, not a subject`);
  const rows: AgeCheckRow[] = subjects.map((s) => {
    const r = bySlug.get(s.slug);
    if (!r) {
      problems.push(`${s.slug}: no research row`);
      return { slug: s.slug, ok: false, reason: 'unknown_lineup' };
    }
    if (r.kind !== s.kind) problems.push(`${s.slug}: kind ${r.kind} in the research file, ${s.kind} in subjects.json`);
    // The photo date is subjects.json's (group-photos.json of the October run), never another one.
    if (r.photo_date !== s.photo.date) problems.push(`${s.slug}: photo date ${String(r.photo_date)} in the research file, ${s.photo.date} in subjects.json`);
    // `agree` false (one source only, or the two sources differ on this person) makes the birth date unconfirmed: it can show a minor,
    // never prove an adult (two agreeing sources, integrator 2026-11-12).
    const people = r.people.map((p) => ({ ...p, birth_confirmed: (p as { agree?: boolean }).agree !== false }));
    const v = ageVerdict({ ...r, people, kind: s.kind, photo_date: s.photo.date, photo_precision: 'day' }, today);
    return { slug: s.slug, ok: v.ok, reason: v.ok ? null : v.reason };
  });
  return {
    file: {
      checked_on: today,
      sources: 'Wikidata membership (P463, P527 with start and end times) and birth dates (P569), each checked against the English Wikipedia article; a birth date with one source, a disagreement or an unknown date leaves the subject out',
      subjects: rows,
    },
    problems,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--today');
  if (!file) {
    console.error('usage: tsx scripts/cards/age-check.mts <path to lineups.json> [--today YYYY-MM-DD]');
    process.exit(2);
  }
  const abs = path.resolve(file);
  if (abs.startsWith(`${REPO}${path.sep}`)) {
    console.error('refused: the research file holds birth dates of minors and must stay outside the repository');
    process.exit(2);
  }
  const t = args.indexOf('--today');
  const today = t >= 0 ? String(args[t + 1]) : new Date().toISOString().slice(0, 10);
  const research = JSON.parse(readFileSync(abs, 'utf8')) as ResearchRow[];
  const subjects = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Array<{ slug: string; kind: 'idol' | 'group'; photo: { date: string } }>;
  const { file: out, problems } = check(research, subjects, today);
  writeFileSync(AGE_JSON, `${JSON.stringify(out, null, 2)}\n`);
  const outs = out.subjects.filter((s) => !s.ok);
  console.log(`${out.subjects.length} subjects, ${out.subjects.length - outs.length} in, ${outs.length} out (rule applied on ${today})`);
  for (const s of outs) console.log(`  out ${s.slug} (${s.reason})`);
  if (problems.length) console.log(`PROBLEMS (${problems.length}):\n${problems.join('\n')}`);
  process.exit(problems.length ? 1 : 0);
}
