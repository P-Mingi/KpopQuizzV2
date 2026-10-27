import { createElement as h, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { clientModulesOf, flightTree, isClientSource } from '@/lib/o1-flight-tree';

const tree = async (n: unknown, client: Array<[unknown, string]> = []): Promise<string> => JSON.stringify(await flightTree(n, { client: new Map(client) }));

describe('flightTree writes a React tree the way the Flight serializer does', () => {
  it('keeps a host element as ["$", type, key, props] with its props in the order they were written', async () => {
    expect(await tree(h('a', { href: '/x', className: 'c' }, 'Go'))).toBe('["$","a",null,{"href":"/x","className":"c","children":"Go"}]');
    expect(await tree(h('li', { key: 'k' }, 'Go'))).toBe('["$","li","k",{"children":"Go"}]');
  });

  it('writes an undefined prop as "$undefined" and keeps it', async () => {
    expect(await tree(h('li', { className: undefined }, 'Jin'))).toBe('["$","li",null,{"className":"$undefined","children":"Jin"}]');
    expect(await tree(h('li', null, 'Jin'))).toBe('["$","li",null,{"children":"Jin"}]');
  });

  it('keeps one child a single child and several children an array, undefined and null children included', async () => {
    expect(await tree(h('span', null, 'J-Hope'))).toBe('["$","span",null,{"children":"J-Hope"}]');
    expect(await tree(h('span', null, 'J-Hope', undefined))).toBe('["$","span",null,{"children":["J-Hope","$undefined"]}]');
    expect(await tree(h('span', null, 'J-Hope', null))).toBe('["$","span",null,{"children":["J-Hope",null]}]');
    expect(await tree(h('span', null, ['a', 'b']))).toBe('["$","span",null,{"children":["a","b"]}]');
    expect(await tree(h('span', null, 3, ' plays'))).toBe('["$","span",null,{"children":[3," plays"]}]');
  });

  it('tells a tree with a hole in a slot from the tree without the slot', async () => {
    const withSlot = (note?: string) => h('a', null, h('i', null, 'x'), note);
    expect(await tree(withSlot())).not.toBe(await tree(h('a', null, h('i', null, 'x'))));
    expect(await tree(h('a', null, h('i', null, 'x')))).toBe('["$","a",null,{"children":["$","i",null,{"children":"x"}]}]');
  });

  it('replaces a keyless fragment by its children and keeps a keyed one', async () => {
    expect(await tree(h('p', null, h(Fragment, null, 'a', 'b')))).toBe('["$","p",null,{"children":["a","b"]}]');
    expect(await tree(h('p', null, h(Fragment, null, 'a')))).toBe('["$","p",null,{"children":"a"}]');
    expect(await tree(h('p', null, h(Fragment, { key: 'f' }, 'a')))).toBe('["$","p",null,{"children":["$","$Sreact.fragment","f",{"children":"a"}]}]');
  });

  it('calls a server component, awaits an async one, and walks what it returns', async () => {
    const Card = (p: { title: string }) => h('h3', null, p.title);
    const Later = async (p: { n: number }) => {
      await Promise.resolve();
      return h('b', null, p.n);
    };
    expect(await tree(h('div', null, h(Card, { title: 'T' }), h(Later, { n: 2 })))).toBe('["$","div",null,{"children":[["$","h3",null,{"children":"T"}],["$","b",null,{"children":2}]]}]');
  });

  it('does not call a client component: it is ["$L", name, props] and its children are walked', async () => {
    let called = 0;
    const Island = (p: { id?: number; children?: unknown }) => { called += 1; return h('i', null, p.children as string); };
    const out = await tree(h('div', null, h(Island, { id: 1 }, h('em', null, 'in'))), [[Island, 'Island']]);
    expect(called).toBe(0);
    expect(out).toBe('["$","div",null,{"children":["$L","Island",{"id":1,"children":["$","em",null,{"children":"in"}]}]}]');
    expect(await tree(h(Island, { key: 'k' }), [[Island, 'Island']])).toBe('["$L","Island",{},"k"]');
  });

  it('wraps a keyed element returned by a keyless server component, and passes the key of a keyed one down', async () => {
    const One = () => h('li', { key: 'a' }, 'x');
    const Plain = () => h('li', null, 'x');
    expect(await tree(h(One, null))).toBe('[["$","li","a",{"children":"x"}]]');
    expect(await tree(h(Plain, { key: 'k' }))).toBe('["$","li","k",{"children":"x"}]');
    expect(await tree(h(Plain, null))).toBe('["$","li",null,{"children":"x"}]');
  });

  it('escapes a string that starts with a dollar sign, and writes the special numbers', async () => {
    expect(await tree(h('p', null, '$5'))).toBe('["$","p",null,{"children":"$$5"}]');
    expect(await tree(h('p', { a: NaN, b: Infinity, c: -0 }))).toBe('["$","p",null,{"a":"$NaN","b":"$Infinity","c":"$-0"}]');
  });

  it('refuses what Flight refuses: a function in a prop', async () => {
    await expect(flightTree(h('button', { onClick: () => undefined }))).rejects.toThrow(/function/);
  });
});

describe('client modules', () => {
  it('reads the directive from the first statement only', () => {
    expect(isClientSource("'use client';\n\nimport x from 'y';")).toBe(true);
    expect(isClientSource('// a comment\n"use client"\nexport const a = 1;')).toBe(true);
    expect(isClientSource("/* c */ 'use client';")).toBe(true);
    expect(isClientSource("import x from 'y';\n'use client';")).toBe(false);
    expect(isClientSource('export const a = 1;')).toBe(false);
  });

  it('finds the client modules of the import graph of a server module, and stops at them', () => {
    const hub = new URL('../components/group/ux-v1/hub.tsx', import.meta.url).pathname;
    const found = clientModulesOf([hub]).map((f) => f.slice(f.indexOf('/src/') + 5));
    expect(found).toContain('components/group/ux-v1/loader.tsx');
    expect(found).not.toContain('components/group/ux-v1/hub-quizzes.tsx');
    expect(found).not.toContain('components/group/ux-v1/member-tiles.tsx');
  });
});
