import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { P2_PAGE_SIZE, p2PageCount, parsePage } from '@/lib/ux-v1/p2/filters';

import {
  QUIZZES_FACETS, quizzesIndexRule, quizzesLastPage, quizzesNeedsLastPage, readQuizzesUrl,
} from './index-rule';

import type { QuizzesSearchParams } from './index-rule';

// /quizzes index rule: the facet crawl trap (at most the sole real group facet is
// indexable; lang is a facet), out-of-range and malformed ?page, and pages 2..N
// keeping a self canonical.

const IDX = { canonical: '/quizzes', index: true };

function decide(sp: QuizzesSearchParams, ctx: { validGroup?: boolean; lastPage?: number | null } = {}) {
  return quizzesIndexRule(readQuizzesUrl(sp), { validGroup: ctx.validGroup ?? false, lastPage: ctx.lastPage ?? null });
}

describe('the listing and its pages', () => {
  it('/quizzes is indexable with a self canonical', () => {
    expect(decide({})).toEqual(IDX);
    expect(decide({}, { lastPage: 9 })).toEqual(IDX);
  });

  it('pages 2..N keep a self canonical (never page 1) and stay indexable', () => {
    expect(decide({ page: '2' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=2', index: true });
    expect(decide({ page: '9' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=9', index: true });
  });

  it('?page=1 is the listing itself', () => {
    expect(decide({ page: '1' }, { lastPage: 9 })).toEqual(IDX);
  });

  it('a page past the last one is noindex with a canonical to the first page', () => {
    expect(decide({ page: '10' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ page: '999' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes', index: false });
    // An empty result has one (empty) page: page 2 is past it.
    expect(decide({ page: '2' }, { lastPage: 1 })).toEqual({ canonical: '/quizzes', index: false });
  });

  it('an unknown size (failed read) takes the page as in range, as the page itself does', () => {
    expect(decide({ page: '999' }, { lastPage: null })).toEqual({ canonical: '/quizzes?page=999', index: true });
  });

  it('a malformed ?page is noindex, canonical to the page it renders', () => {
    for (const page of ['0', '-1', '-3', 'abc', '', '1.5', ' 1']) {
      expect(decide({ page }, { lastPage: 9 }), page).toEqual({ canonical: '/quizzes', index: false });
    }
    // Rendered as page 2 by the live parse rule, so the closest clean URL is ?page=2.
    expect(decide({ page: '02' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=2', index: false });
    expect(decide({ page: '2abc' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=2', index: false });
    expect(decide({ page: '99999999999999999999' })).toEqual({ canonical: '/quizzes?page=100000000000000000000', index: false });
  });
});

describe('facets', () => {
  it('lang is a facet: never indexable, canonical /quizzes', () => {
    expect(decide({ lang: 'ko' })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ lang: 'en' })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ lang: 'ko', page: '2' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes', index: false });
  });

  it('type, level, sort (even its default) and search: noindex, canonical /quizzes', () => {
    for (const sp of [{ type: 'tf' }, { level: 'hard' }, { sort: 'newest' }, { sort: 'all' }, { sort: 'most_played' }, { search: 'bts' }, { type: '' }]) {
      expect(decide(sp), JSON.stringify(sp)).toEqual({ canonical: '/quizzes', index: false });
    }
  });

  it('the sole real group facet stays indexable, canonical to the group page (Part B), with or without ?page', () => {
    expect(decide({ group: 'bts' }, { validGroup: true })).toEqual({ canonical: '/bts-quiz', index: true });
    expect(decide({ group: 'bts', page: '2' }, { validGroup: true, lastPage: 3 })).toEqual({ canonical: '/bts-quiz', index: true });
  });

  it('a group page past its last page, or an unknown slug, is noindex', () => {
    expect(decide({ group: 'bts', page: '9' }, { validGroup: true, lastPage: 3 })).toEqual({ canonical: '/bts-quiz', index: false });
    expect(decide({ group: 'not-a-group' }, { validGroup: false })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ group: '' })).toEqual({ canonical: '/quizzes', index: false });
  });

  it('2+ facets: noindex,follow and canonical /quizzes (e2e p2.spec pins group+sort)', () => {
    expect(decide({ group: 'bts', sort: 'newest' }, { validGroup: true })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ group: 'bts', lang: 'ko' }, { validGroup: true })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ type: 'tf', level: 'easy', page: '2' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes', index: false });
  });
});

describe('unknown and repeated params', () => {
  it('an unknown param is noindex, canonical to the URL without it', () => {
    expect(decide({ difficulty: 'easy' })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ difficulty: 'easy', lang: 'ko' })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ utm_source: 'x' })).toEqual({ canonical: '/quizzes', index: false });
    expect(decide({ utm_source: 'x', page: '2' }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=2', index: false });
    expect(decide({ group: 'bts', ref: 'x' }, { validGroup: true })).toEqual({ canonical: '/bts-quiz', index: false });
  });

  it('a repeated param is a variant: noindex', () => {
    expect(decide({ page: ['2', '3'] }, { lastPage: 9 })).toEqual({ canonical: '/quizzes?page=2', index: false });
    expect(decide({ group: ['bts', 'exo'] }, { validGroup: true })).toEqual({ canonical: '/bts-quiz', index: false });
  });

  it('an undefined entry is not a param', () => {
    expect(decide({ lang: undefined, page: undefined })).toEqual(IDX);
  });
});

describe('readQuizzesUrl', () => {
  it('lists the facets in a fixed order and the extras', () => {
    expect(readQuizzesUrl({ sort: 'newest', lang: 'ko', foo: '1', group: 'bts' })).toEqual({
      facets: ['group', 'lang', 'sort'], extra: ['foo'], soleGroup: null, page: 1, pageClean: true,
    });
    expect(readQuizzesUrl({ group: 'bts', page: '3' })).toEqual({
      facets: ['group'], extra: [], soleGroup: 'bts', page: 3, pageClean: true,
    });
    expect([...QUIZZES_FACETS]).toEqual(['group', 'type', 'level', 'lang', 'sort', 'search']);
  });

  it('the page it reads is the page the listing renders (same rule as P2 parsePage)', () => {
    for (const raw of [undefined, '', '1', '2', '02', '2abc', '0', '-1', 'abc', '1.5', '999']) {
      expect(readQuizzesUrl(raw === undefined ? {} : { page: raw }).page, String(raw)).toBe(parsePage(raw));
    }
  });
});

describe('quizzesNeedsLastPage / quizzesLastPage', () => {
  it('the size is read only for ?page>1 of an indexable view', () => {
    expect(quizzesNeedsLastPage(readQuizzesUrl({ page: '2' }), false)).toBe(true);
    expect(quizzesNeedsLastPage(readQuizzesUrl({ group: 'bts', page: '2' }), true)).toBe(true);
    expect(quizzesNeedsLastPage(readQuizzesUrl({ group: 'nope', page: '2' }), false)).toBe(false);
    expect(quizzesNeedsLastPage(readQuizzesUrl({}), false)).toBe(false);
    expect(quizzesNeedsLastPage(readQuizzesUrl({ lang: 'ko', page: '2' }), false)).toBe(false);
  });

  it('counts pages like the v11 render (p2PageCount)', () => {
    for (const total of [0, 1, 47, 48, 49, 96, 97, 431]) {
      expect(quizzesLastPage(total, P2_PAGE_SIZE), String(total)).toBe(p2PageCount(total));
    }
    expect(quizzesLastPage(-5, 48)).toBe(1);
  });
});

describe('sources', () => {
  it('no em or en dash in the /quizzes index rule sources', () => {
    for (const f of ['index-rule.ts', 'index-rule.test.ts', 'page.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      expect(/[\u2013\u2014]/.test(src), f).toBe(false);
    }
  });
});
