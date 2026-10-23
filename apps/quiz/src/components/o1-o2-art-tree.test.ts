import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

import type { UxQuizCardData } from '@/components/ux-v1/quiz-card';

// Run O1, lane O2 (series art): the kpop components that now show the anime series art on a build whose site is not kpop
// keep the React Flight tree they had on kpop. Same method as o1-kpop-tree.test.ts: each render is walked like the Flight
// serializer (lib/o1-flight-tree.ts) and compared with the file of __o1_o2_art_tree__/, written ONLY from the base commit
// 317a935 (before any change of the lane): O1_WRITE_TREE=1 writes them, a plain run compares. The test runs on the kpop
// site (no NEXT_PUBLIC_SITE_ID), which is what the files describe.

const DIR = fileURLToPath(new URL('./__o1_o2_art_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('..', import.meta.url));

const CARD: UxQuizCardData = {
  slug: 'bts-basics', title: 'BTS basics: the members and the debut', group_name: 'BTS', group_slug: 'bts', quiz_type: 'multiple_choice',
  difficulty: 'easy', play_count: 1200, cover_image_url: null,
};
const CARDS: UxQuizCardData[] = [
  CARD,
  { ...CARD, slug: 'a', title: 'A true or false round', group_name: 'An Unknown Group', group_slug: 'an-unknown-group', quiz_type: 'true_false', play_count: 3 },
  { ...CARD, slug: 'b', title: 'Guess from clues', group_name: 'TXT', group_slug: 'txt', quiz_type: 'guess_from_clues', difficulty: 'hard', play_count: 40 },
  { ...CARD, slug: 'c', title: 'With a cover', quiz_type: 'image', cover_image_url: '/covers/c.jpg' },
];
const RAIL = [
  { slug: 'bts', name: 'BTS', photo: '/idols/BTS.jpg', initials: 'BT', quizzes: 12, isNew: false },
  { slug: 'a-group-with-a-very-long-name', name: 'A Group With A Very Long Name Indeed', photo: null, initials: 'AG', quizzes: 1, isNew: true },
];
const FULL = {
  id: 'q-1', title: 'A quiz', slug: 'a-quiz', quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en', play_count: 90,
  total_score_sum: 40, total_completions: 5, like_count: 2, created_at: '2026-10-01T00:00:00Z', group_name: 'BTS', group_slug: 'bts',
  display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'fan', creator_avatar_url: null,
  creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 10, question_count: 3, cover_image_url: null,
};

let refs: Map<unknown, string>;

function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

async function check(name: string, node: unknown): Promise<void> {
  const tree = JSON.stringify(await flightTree(node, { client: refs }));
  const file = `${DIR}${name}.json`;
  if (WRITE) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, `${tree}\n`);
    return;
  }
  const want = readFileSync(file, 'utf8').trimEnd();
  if (tree === want) return;
  const at = firstDifference(tree, want);
  const around = (s: string): string => s.slice(Math.max(0, at - 90), at + 110);
  expect({ name, bytes: tree.length, firstDifferenceAt: at, around: around(tree) }).toEqual({ name, bytes: want.length, firstDifferenceAt: at, around: around(want) });
}

beforeAll(async () => {
  const entries = [
    'components/ux-v1/quiz-card.tsx',
    'components/home/ux-v1/groups-rail.tsx',
    'components/home/ux-v1/quiz-rows.tsx',
    'components/profile/ux-v1/rows.tsx',
    'components/create/ux-v1/group-field.tsx',
  ].map((f) => `${SRC}${f}`);
  const found = await clientRefsOf(entries);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
});

afterAll(() => undefined);

describe('the kpop components that show the series art on anime keep their tree', () => {
  it('UxQuizCard: photo, typographic cover, own cover, priority, sizes, class, preview and stack', async () => {
    const { UxQuizCard, UxQuizGrid } = await import('@/components/ux-v1/quiz-card');
    await check('quiz-card', [
      h(UxQuizGrid, { children: CARDS.map((q) => h(UxQuizCard, { key: q.slug, quiz: q })) }),
      h(UxQuizGrid, { stack: true, columns: 3, children: CARDS.map((q) => h(UxQuizCard, { key: q.slug, quiz: q, titleAs: 'h2', priority: true, sizes: '96px', className: 'x' })) }),
      h(UxQuizCard, { quiz: { ...CARD, cover_image_url: 'data:image/png;base64,AAAA' }, preview: true }),
      h(UxQuizCard, { quiz: { ...CARDS[1]!, cover_image_url: 'data:image/png;base64,AAAA' }, preview: true, previewLabel: 'Preview of the draft' }),
      h(UxQuizCard, { quiz: CARDS[1]!, preview: true }),
    ]);
  });

  it('GroupsRail, a group with a photo and one without', async () => {
    const { GroupsRail } = await import('@/components/home/ux-v1/groups-rail');
    await check('groups-rail', h(GroupsRail, { groups: RAIL }));
  });

  it('BestRows and NewRows', async () => {
    const { BestRows, NewRows } = await import('@/components/home/ux-v1/quiz-rows');
    const rows = [FULL, { ...FULL, id: 'q-2', slug: 'b', group_name: 'An Unknown Group', group_slug: 'an-unknown-group', quiz_type: 'true_false' }, { ...FULL, id: 'q-3', slug: 'c', cover_image_url: '/covers/c.jpg', logo_url: '/logos/bts.png' }];
    await check('quiz-rows', [h(BestRows, { quizzes: rows as never }), h(NewRows, { quizzes: rows as never, now: new Date('2026-10-23T12:00:00Z') })]);
  });

  it('the passport rows: GroupAvatar, Thumb and QuizRows', async () => {
    const { GroupAvatar, Thumb, QuizRows } = await import('@/components/profile/ux-v1/rows');
    await check('passport-rows', [
      h(GroupAvatar, { slug: 'bts', name: 'BTS' }),
      h(GroupAvatar, { slug: 'an-unknown-group', name: 'An Unknown Group' }),
      h(Thumb, { src: null }),
      h(Thumb, { src: '/idols/BTS.jpg', glyph: 'music' }),
      h(QuizRows, { quizzes: [FULL, { ...FULL, id: 'q-2', slug: 'b', group_slug: 'an-unknown-group' }] as never }),
    ]);
  });

  it('the create form group avatar', async () => {
    const { GroupAvatar } = await import('@/components/create/ux-v1/group-field');
    await check('group-field-avatar', [h(GroupAvatar, { slug: 'bts', name: 'BTS' }), h(GroupAvatar, { slug: null, name: 'New group' }), h(GroupAvatar, { slug: 'an-unknown-group', name: 'An Unknown Group' })]);
  });
});
