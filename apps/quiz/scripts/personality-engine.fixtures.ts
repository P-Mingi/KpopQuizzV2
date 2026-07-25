// Workstream P, step 3: engine fixtures. Run: npx tsx scripts/personality-engine.fixtures.ts
// Three hand-computed cases assert the raw sums and print the full math
// (maxima, normalized vector, top-3 members). Pure, no network.

import {
  AXIS_KEYS, axisMaxima, scoreRaw, scorePlayer, runQuiz, matchPct,
  type Axes, type PersonalityQuestion, type PersonalityProfile,
} from '../src/lib/personality/engine';

// The 10 questions (same weights the seed writes).
const Q: PersonalityQuestion[] = [
  { ord: 1, question: '', options: [
    { text: '', weights: { care: 5, energy: 3 } }, { text: '', weights: { chaos: 5, energy: 5 } },
    { text: '', weights: { heart: 5, energy: 0, spotlight: 5 } }, { text: '', weights: { care: 5, chaos: 3 } } ] },
  { ord: 2, question: '', options: [
    { text: '', weights: { chaos: 0, care: 3 } }, { text: '', weights: { craft: 5, spotlight: 5 } },
    { text: '', weights: { chaos: 5, energy: 5 } }, { text: '', weights: { heart: 0, energy: 0 } } ] },
  { ord: 3, question: '', options: [
    { text: '', weights: { care: 0, heart: 0 } }, { text: '', weights: { energy: 5, chaos: 4 } },
    { text: '', weights: { spotlight: 5, heart: 2 } }, { text: '', weights: { craft: 5 } } ] },
  { ord: 4, question: '', options: [
    { text: '', weights: { heart: 3, chaos: 2 } }, { text: '', weights: { energy: 5, heart: 0 } },
    { text: '', weights: { spotlight: 0, energy: 2 } }, { text: '', weights: { energy: 0, chaos: 2 } } ] },
  { ord: 5, question: '', options: [
    { text: '', weights: { spotlight: 0, craft: 0 } }, { text: '', weights: { chaos: 5, craft: 2 } },
    { text: '', weights: { care: 3, craft: 0, chaos: 0 } }, { text: '', weights: { craft: 5 } } ] },
  { ord: 6, question: '', options: [
    { text: '', weights: { care: 0, energy: 2 } }, { text: '', weights: { craft: 4, chaos: 3 } },
    { text: '', weights: { chaos: 5, energy: 4 } }, { text: '', weights: { spotlight: 5, care: 0 } } ] },
  { ord: 7, question: '', options: [
    { text: '', weights: { heart: 4, craft: 0 } }, { text: '', weights: { heart: 0, care: 0 } },
    { text: '', weights: { energy: 0, chaos: 2 } }, { text: '', weights: { craft: 5, spotlight: 4 } } ] },
  { ord: 8, question: '', options: [
    { text: '', weights: { heart: 5, energy: 0 } }, { text: '', weights: { spotlight: 5, heart: 3 } },
    { text: '', weights: { energy: 5, heart: 0 } }, { text: '', weights: { chaos: 5 } } ] },
  { ord: 9, question: '', options: [
    { text: '', weights: { spotlight: 5, craft: 3 } }, { text: '', weights: { chaos: 4, energy: 4 } },
    { text: '', weights: { care: 5, heart: 0 } }, { text: '', weights: { spotlight: 0, energy: 5 } } ] },
  { ord: 10, question: '', options: [
    { text: '', weights: { care: 0, craft: 2 } }, { text: '', weights: { chaos: 5, energy: 4 } },
    { text: '', weights: { heart: 0, spotlight: 3 } }, { text: '', weights: { spotlight: 0, heart: 2 } } ] },
];

const ax = (energy: number, chaos: number, care: number, craft: number, heart: number, spotlight: number): Axes =>
  ({ energy, chaos, care, craft, heart, spotlight });

// Stray Kids profiles (from the FINAL bank).
const SKZ: PersonalityProfile[] = [
  { member_name: 'Bang Chan', member_slug: 'bang-chan', photo_url: null, trait_lines: [], axes: ax(55, 30, 5, 80, 25, 55) },
  { member_name: 'Lee Know', member_slug: 'lee-know', photo_url: null, trait_lines: [], axes: ax(30, 55, 40, 20, 75, 60) },
  { member_name: 'Changbin', member_slug: 'changbin', photo_url: null, trait_lines: [], axes: ax(80, 65, 35, 75, 35, 40) },
  { member_name: 'Hyunjin', member_slug: 'hyunjin', photo_url: null, trait_lines: [], axes: ax(45, 50, 45, 45, 30, 15) },
  { member_name: 'Han', member_slug: 'han', photo_url: null, trait_lines: [], axes: ax(60, 80, 55, 75, 30, 45) },
  { member_name: 'Felix', member_slug: 'felix', photo_url: null, trait_lines: [], axes: ax(55, 60, 40, 25, 10, 35) },
  { member_name: 'Seungmin', member_slug: 'seungmin', photo_url: null, trait_lines: [], axes: ax(35, 45, 50, 30, 80, 50) },
  { member_name: 'I.N', member_slug: 'i-n', photo_url: null, trait_lines: [], axes: ax(45, 50, 85, 15, 40, 45) },
];

let failures = 0;
const fmt = (a: Axes): string => AXIS_KEYS.map((k) => `${k}:${a[k].toFixed(1)}`).join(' ');
function assertRaw(got: Axes, want: Axes): void {
  const ok = AXIS_KEYS.every((k) => got[k] === want[k]);
  console.log(`  raw sums:  ${AXIS_KEYS.map((k) => `${k}:${got[k]}`).join(' ')}  ${ok ? 'OK' : `FAIL (want ${fmt(want)})`}`);
  if (!ok) failures++;
}

console.log('MAXIMA (normalization ceilings):', fmt(axisMaxima(Q)), '\n');

const fixtures: { name: string; picks: number[]; wantRaw: Axes }[] = [
  { name: 'A - all option b (index 1): loud + feral, low care', picks: Array(10).fill(1), wantRaw: ax(23, 26, 0, 11, 3, 10) },
  { name: 'B - all option a (index 0): quiet + calm, tough-love', picks: Array(10).fill(0), wantRaw: ax(5, 2, 8, 5, 12, 5) },
  { name: 'C - all option d (index 3): high craft (studio/creator)', picks: Array(10).fill(3), wantRaw: ax(5, 10, 5, 15, 2, 9) },
];

for (const fx of fixtures) {
  console.log(`Fixture ${fx.name}`);
  assertRaw(scoreRaw(Q, fx.picks), fx.wantRaw);
  const norm = scorePlayer(Q, fx.picks);
  console.log(`  normalized: ${fmt(norm)}`);
  const res = runQuiz(Q, fx.picks, SKZ);
  const top3 = res.ranked.slice(0, 3).map((m) => `${m.profile.member_name} (dist ${m.distance.toFixed(1)}, ${m.matchPct}%)`);
  console.log(`  top 3:     ${top3.join('  |  ')}`);
  // determinism: re-run must give the same winner
  const again = runQuiz(Q, fx.picks, SKZ);
  if (again.top.profile.member_name !== res.top.profile.member_name) { console.log('  DETERMINISM FAIL'); failures++; }
  // floor: no match % below 55
  if (res.ranked.some((m) => m.matchPct < 55)) { console.log('  FLOOR FAIL'); failures++; }
  console.log('');
}

// matchPct math check: a max-distance vector floors to 55.
const worst = matchPct(Math.sqrt(6) * 100);
console.log(`matchPct(max distance) = ${worst} (floor check: ${worst === 55 ? 'OK' : 'FAIL'})`);
if (worst !== 55) failures++;

console.log(`\n${failures === 0 ? 'ALL FIXTURES PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
