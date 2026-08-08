// V-FOUNDATION F1 Phase E receipt - the 5x3x10 menu caps (F3), enforced in code (nav.ts).
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phasee.mts
import { validateNavTree, TOP_MAX, CHILD_MAX } from '../src/lib/verse/tree/nav';

let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };

const pageNode = (label: string, slug: string, children?: unknown[]) => ({ label, ref: { kind: 'page', slug }, ...(children ? { children } : {}) });

// a valid 5 x 3 x 10 tree
const valid = [
  { label: 'Home', ref: { kind: 'page', slug: 'home' } },
  { label: 'Discography', children: [
    { label: 'Albums', children: [pageNode('WINGS', 'wings'), pageNode('BE', 'be')] },
    { label: 'Tracks A-Z', ref: { kind: 'index', key: 'tracks' } },
  ] },
  pageNode('Members', 'members'),
  pageNode('Community', 'community'),
  pageNode('About', 'about'),
];
check('a valid 5x3x10 tree is accepted', validateNavTree(valid).ok, validateNavTree(valid).errors.join(' | ') || 'ok');
check('page ref + index ref both survive', (() => { const t = validateNavTree(valid).tree!; return t[1]!.children![1]!.ref?.kind === 'index' && t[0]!.ref?.kind === 'page'; })(), 'ok');

// 6 top-level -> reject (TOP_MAX = 5)
const sixTop = Array.from({ length: TOP_MAX + 1 }, (_, i) => pageNode(`T${i}`, `t${i}`));
check(`> ${TOP_MAX} top-level entries rejected`, !validateNavTree(sixTop).ok, validateNavTree(sixTop).errors[0]);

// 11 children -> reject (CHILD_MAX = 10)
const elevenKids = [{ label: 'Big', children: Array.from({ length: CHILD_MAX + 1 }, (_, i) => pageNode(`C${i}`, `c${i}`)) }];
check(`> ${CHILD_MAX} children rejected`, !validateNavTree(elevenKids).ok, validateNavTree(elevenKids).errors[0]);

// 4 levels deep -> reject (LEVEL_MAX = 3)
const fourDeep = [{ label: 'L1', children: [{ label: 'L2', children: [{ label: 'L3', children: [pageNode('L4', 'l4')] }] }] }];
check('a 4th level is rejected (max 3 levels)', !validateNavTree(fourDeep).ok, validateNavTree(fourDeep).errors[0]);

// a node with neither a target nor children -> reject (no dead entries)
check('an entry with no target and no children is rejected', !validateNavTree([{ label: 'Nowhere' }]).ok, validateNavTree([{ label: 'Nowhere' }]).errors[0]);

// a bad page slug -> reject
check('an invalid page slug is rejected', !validateNavTree([{ label: 'X', ref: { kind: 'page', slug: 'Bad Slug!' } }]).ok, validateNavTree([{ label: 'X', ref: { kind: 'page', slug: 'Bad Slug!' } }]).errors[0]);

console.log(`\nPhase E menu caps: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
