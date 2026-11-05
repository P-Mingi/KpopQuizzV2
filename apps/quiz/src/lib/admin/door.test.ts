// ADMIN-2: the pure parts of the secret door, with an obviously fake ADMIN_PATH set inside each test: the address segment, the rewrite target,
// the header value, the paths of the code pages and the validation of the address an admin returns to.
import { describe, expect, it } from 'vitest';

import { ADMIN_INTERNAL_ROOT, adminDoorPrefix, adminDoorTarget, adminDoorValue, adminPathName, isAdminDoorValue } from './door';
import { adminPathsFor, safeAdminNext } from './paths';
import { SECTION_ORDER, adminHref, buildMenu, sectionLabel, toolsOf } from './menu';

const FAKE = 'test-door-not-a-secret';
const env = (v: string | undefined): Record<string, string | undefined> => ({ ADMIN_PATH: v });

describe('the address segment', () => {
  it('is a usable value only when it is 20 to 64 lowercase letters, digits and dashes, inside letters or digits', () => {
    expect(adminPathName(env(FAKE))).toBe(FAKE);
    expect(adminPathName(env(`  ${FAKE}  `))).toBe(FAKE);
    expect(adminDoorPrefix(env(FAKE))).toBe(`/${FAKE}`);
    for (const bad of [undefined, '', 'admin', 'short-value', 'x'.repeat(19), 'a'.repeat(65), 'Test-Door-Not-A-Secret-1', 'test.door.not.a.secret.0', 'test_door_not_a_secret_0', '-test-door-not-a-secret', 'test-door-not-a-secret-', 'test door not a secret 0', 'test/door/not/a/secret/0', 'test-door-not-a-secret-quiz', 'test-door-not-a-secret-trivia']) {
      expect(adminPathName(env(bad)), String(bad)).toBeNull();
      expect(adminDoorPrefix(env(bad))).toBeNull();
    }
    expect(adminPathName(env('a'.repeat(20)))).toBe('a'.repeat(20));
    expect(adminPathName(env('a'.repeat(64)))).toBe('a'.repeat(64));
  });
});

describe('the rewrite target', () => {
  it('maps the address and the pages below it to the internal tree, and nothing else', () => {
    expect(adminDoorTarget(`/${FAKE}`, env(FAKE))).toBe(ADMIN_INTERNAL_ROOT);
    expect(adminDoorTarget(`/${FAKE}/`, env(FAKE))).toBe(ADMIN_INTERNAL_ROOT);
    expect(adminDoorTarget(`/${FAKE}/code`, env(FAKE))).toBe('/admin/code');
    expect(adminDoorTarget(`/${FAKE}/quizzes`, env(FAKE))).toBe('/admin/quizzes');
    expect(adminDoorTarget(`/${FAKE}/a-b/c1`, env(FAKE))).toBe('/admin/a-b/c1');
  });

  it.each([
    ['a shorter prefix', `/${FAKE.slice(0, -1)}`],
    ['a longer first segment', `/${FAKE}x`],
    ['a longer first segment with a page', `/${FAKE}x/code`],
    ['the same letters in capitals', `/${FAKE.toUpperCase()}`],
    ['another segment first', `/x${FAKE}`],
    ['the address inside another path', `/a/${FAKE}`],
    ['a capital in the page', `/${FAKE}/Code`],
    ['a dotted page', `/${FAKE}/code.json`],
    ['an empty segment', `/${FAKE}//code`],
    ['a dot segment', `/${FAKE}/../admin`],
    ['an encoded dot segment', `/${FAKE}/%2e%2e/admin`],
    ['a space', `/${FAKE}/co de`],
    ['a trailing dash segment', `/${FAKE}/code-`],
    ['the internal path itself', '/admin'],
    ['the internal sites path', '/sites/hub/admin'],
  ])('%s is no door', (_n, path) => {
    expect(adminDoorTarget(path, env(FAKE))).toBeNull();
  });

  it('is no door at all without a usable ADMIN_PATH', () => {
    for (const v of [undefined, '', 'admin']) {
      expect(adminDoorTarget(`/${FAKE}`, env(v))).toBeNull();
      expect(adminDoorTarget('/admin', env(v))).toBeNull();
    }
  });
});

describe('the header value', () => {
  it('is a SHA-256 of the address, stable for one address and different for another', async () => {
    const a = await adminDoorValue(env(FAKE));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await adminDoorValue(env(FAKE))).toBe(a);
    expect(await adminDoorValue(env(`${FAKE}-2`))).not.toBe(a);
    expect(a).not.toContain(FAKE);
    expect(await adminDoorValue(env(undefined))).toBeNull();
  });

  it('is accepted only exactly: not empty, not a flag, not the address, not a near miss, not another address\'s value', async () => {
    const value = (await adminDoorValue(env(FAKE)))!;
    expect(await isAdminDoorValue(value, env(FAKE))).toBe(true);
    for (const bad of [null, undefined, '', '1', 'true', FAKE, value.toUpperCase(), value.slice(1), `${value}0`, `${value.slice(0, -1)}${value.endsWith('0') ? '1' : '0'}`, (await adminDoorValue(env(`${FAKE}-2`)))!]) {
      expect(await isAdminDoorValue(bad, env(FAKE)), String(bad)).toBe(false);
    }
    expect(await isAdminDoorValue(value, env(undefined))).toBe(false);
  });
});

describe('the code pages and the address to return to', () => {
  it('follow the secret address on the hub and stay /admin/k7q2m on kpop and anime', () => {
    expect(adminPathsFor(`/${FAKE}`)).toEqual({ home: `/${FAKE}`, code: `/${FAKE}/code`, setup: `/${FAKE}/setup` });
    expect(adminPathsFor(null)).toEqual({ home: '/admin', code: '/admin/k7q2m/code', setup: '/admin/k7q2m/setup' });
  });

  const P = `/${FAKE}`;
  it('accepts an internal path under the address, with a query', () => {
    expect(safeAdminNext(P, P)).toBe(P);
    expect(safeAdminNext(`${P}/quizzes`, P)).toBe(`${P}/quizzes`);
    expect(safeAdminNext(`${P}/quizzes?site=kpop&status=removed`, P)).toBe(`${P}/quizzes?site=kpop&status=removed`);
  });

  it.each([
    ['an external URL', 'https://evil.example/'],
    ['a protocol-relative URL', `//evil.example${P}`],
    ['a path outside the address', '/admin'],
    ['a longer first segment', `${P}x/quizzes`],
    ['a scheme after the path', `${P}/x?next=https://evil.example`],
    ['a javascript URL', 'javascript:alert(1)'],
    ['a backslash', `${P}\\quizzes`],
    ['a dot segment', `${P}/../x`],
    ['an encoded character', `${P}/%2f%2fevil`],
    ['a double slash', `${P}//evil.example`],
    ['a control character', `${P}/x\ny`],
    ['the code page itself (a loop)', `${P}/code`],
    ['the setup page itself', `${P}/setup?x=1`],
    ['an empty value', ''],
    ['a value of 301 characters', `${P}/${'a'.repeat(301)}`],
  ])('refuses %s', (_n, raw) => {
    expect(safeAdminNext(raw, P)).toBeNull();
  });

  it('refuses a missing value', () => {
    expect(safeAdminNext(null, P)).toBeNull();
    expect(safeAdminNext(undefined, P)).toBeNull();
  });
});

describe('the left menu', () => {
  const P = `/${FAKE}`;

  it('has the three sections in the order Bunnyverse, KpopQuiz, OtakuQuiz', () => {
    expect(SECTION_ORDER).toEqual(['hub', 'kpop', 'anime']);
    expect(SECTION_ORDER.map(sectionLabel)).toEqual(['Bunnyverse', 'KpopQuiz', 'OtakuQuiz']);
  });

  it('offers the hub no quiz tools, the two quiz sites all four, and every tool has a page', () => {
    expect(toolsOf('hub').map((t) => t.key)).toEqual(['overview', 'journal']);
    expect(toolsOf('kpop').map((t) => t.key)).toEqual(['overview', 'quizzes', 'reports', 'journal']);
    expect(toolsOf('anime').map((t) => t.key)).toEqual(['overview', 'quizzes', 'reports', 'journal']);
  });

  it('puts the site on every link as ?site=, and the all-sites links carry none', () => {
    for (const section of buildMenu(P, 'kpop', 'quizzes')) {
      for (const tool of section.tools) expect(tool.href).toBe(`${P}${tool.path}?site=${section.site}`);
    }
    expect(adminHref(P, '/journal', null)).toBe(`${P}/journal`);
    expect(adminHref(P, '', 'anime')).toBe(`${P}?site=anime`);
  });

  it('marks the open section and the open tool only', () => {
    const menu = buildMenu(P, 'anime', 'reports');
    expect(menu.filter((s) => s.current).map((s) => s.site)).toEqual(['anime']);
    expect(menu.flatMap((s) => s.tools.filter((t) => t.current).map((t) => `${s.site}:${t.key}`))).toEqual(['anime:reports']);
    expect(buildMenu(P, null, 'overview').some((s) => s.current)).toBe(false);
  });
});
