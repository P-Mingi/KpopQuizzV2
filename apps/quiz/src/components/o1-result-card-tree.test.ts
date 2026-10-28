import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

// Run O1 (ADM join): the shared ResultCard gets an optional photo position (the focal point of a character portrait on the personality
// result of fandomverse.org/anime). On kpopquiz.org nothing may change, so every kpop use of the card keeps, byte for byte, the React Flight
// tree it has at the base (e589af9, before this change): the same props and children, no new prop even undefined, no new client
// component. The files of __o1_kpop_tree__/result-card-*.json were written from the base ResultCard with O1_WRITE_TREE=1 (never from
// the head); a plain run compares. The same pattern as o1-kpop-tree.test.ts.

const DIR = fileURLToPath(new URL('./__o1_kpop_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('..', import.meta.url));
const flags = globalThis as { __v12?: boolean };

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));

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
  const found = await clientRefsOf([`${SRC}components/ux-v1/result-card.tsx`]);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
});

describe('the kpop result card keeps its tree', () => {
  it('a group result with its photo, role, traits, the share line and the buttons', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    await check('result-card-group', h(ResultCard, {
      eyebrow: 'Your group is',
      name: 'Stray Kids',
      role: 'Eight members, one sound',
      description: 'You like it loud and you like it together.',
      traits: ['Loud', 'Loyal', 'Restless'],
      photo: { src: '/idols/STRAY KIDS.jpg', alt: 'Stray Kids' },
      same: h('span', null, '16% of STAY got Stray Kids'),
      actions: h('button', { type: 'button' }, 'Share my result'),
    }));
  });

  it('a member result: no photo, the initial', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    await check('result-card-member', h(ResultCard, {
      eyebrow: 'You are',
      name: 'Bang Chan',
      role: 'Leader and producer',
      description: 'You carry the team.',
      traits: ['Steady', 'Warm'],
      nameAs: 'h1',
      className: 'extra',
    }));
  });

  it('a result with a photo object that carries no position, as quiz.tsx passes it on kpop', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    await check('result-card-photo-only', h(ResultCard, { eyebrow: 'You are', name: 'Hyunjin', photo: { src: '/idols/members/hyunjin.jpg', alt: 'Hyunjin' } }));
  });
});

describe('the result card with a focal point (fandomverse.org/anime)', () => {
  const base = { eyebrow: 'You are', name: 'Ryuk', role: 'Shinigami' };
  it('puts the focal point on the picture as its object-position, in the v11 and in the v12 picture', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    for (const v12 of [false, true]) {
      flags.__v12 = v12;
      const html = renderToStaticMarkup(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk', position: '30% 20%' } }));
      expect(html).toContain('style="object-position:30% 20%"');
    }
  });

  it('renders the same markup as before when the position is absent or empty', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    for (const v12 of [false, true]) {
      flags.__v12 = v12;
      const plain = renderToStaticMarkup(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk' } }));
      expect(plain).not.toContain('style=');
      expect(renderToStaticMarkup(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk', position: '' } }))).toBe(plain);
      expect(renderToStaticMarkup(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk', position: undefined } }))).toBe(plain);
    }
  });

  it('adds the style prop to the picture and nothing else to the tree', async () => {
    const { ResultCard } = await import('@/components/ux-v1/result-card');
    const without = JSON.stringify(await flightTree(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk' } }), { client: refs }));
    const withPos = JSON.stringify(await flightTree(h(ResultCard, { ...base, photo: { src: '/p.webp', alt: 'Ryuk', position: '30% 20%' } }), { client: refs }));
    expect(withPos).toBe(without.replace('"height":92}', '"height":92,"style":{"objectPosition":"30% 20%"}}'));
  });
});
